import { useCallback, useEffect, useMemo, useState } from 'react';
import { diffSync, eventToReservationInput, parseIcal } from '../lib/ical-logic';
import { fr } from '../lib/i18n/fr';
import { supabase } from '../lib/supabase';
import type {
  IcalFeed,
  IcalFeedCreateInput,
  IcalFeedUpdateInput,
  IcalFeedWithRelations,
  IcalSyncLog,
  IcalSyncStatus,
  IcalSyncSummary,
} from '../types/ical';

interface RawIcalFeedRow extends Omit<IcalFeed, 'last_sync_imported_count' | 'last_sync_skipped_count'> {
  last_sync_imported_count: number | string;
  last_sync_skipped_count: number | string;
  properties?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

interface RawIcalSyncLogRow extends Omit<IcalSyncLog, 'imported_count' | 'skipped_count' | 'events_summary'> {
  imported_count: number | string;
  skipped_count: number | string;
  events_summary: Record<string, unknown> | null;
}

interface SupabaseErrorLike {
  message: string;
}

interface FeedFinalizePayload {
  status: Exclude<IcalSyncStatus, 'running'>;
  importedCount: number;
  skippedCount: number;
  errorMessage: string | null;
}

function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof (error as SupabaseErrorLike).message === 'string'
  ) {
    return new Error((error as SupabaseErrorLike).message);
  }
  return new Error('Unknown error');
}

function toFiniteNumber(value: number | string, fallback: number = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeFeed(row: RawIcalFeedRow): IcalFeedWithRelations {
  const property = toSingle(row.properties);
  return {
    ...row,
    last_sync_imported_count: toFiniteNumber(row.last_sync_imported_count),
    last_sync_skipped_count: toFiniteNumber(row.last_sync_skipped_count),
    property_name: property?.name ?? undefined,
  };
}

function normalizeLog(row: RawIcalSyncLogRow): IcalSyncLog {
  return {
    ...row,
    imported_count: toFiniteNumber(row.imported_count),
    skipped_count: toFiniteNumber(row.skipped_count),
    events_summary: row.events_summary ?? null,
  };
}

function enrichFeedsWithRecentLogs(feeds: IcalFeedWithRelations[], logs: IcalSyncLog[]): IcalFeedWithRelations[] {
  const byFeedId = new Map<string, IcalSyncLog[]>();
  logs.forEach((log) => {
    if (!byFeedId.has(log.feed_id)) {
      byFeedId.set(log.feed_id, []);
    }
    byFeedId.get(log.feed_id)?.push(log);
  });

  return feeds.map((feed) => ({
    ...feed,
    recent_logs: (byFeedId.get(feed.id) || []).slice(0, 5),
  }));
}

function computeDateRange(events: Array<{ dtstart: string; dtend: string }>): { start: string; end: string } | undefined {
  if (events.length === 0) return undefined;

  const starts = events.map((event) => event.dtstart).sort();
  const ends = events.map((event) => event.dtend).sort();

  const start = starts[0];
  const end = ends[ends.length - 1];

  if (!start || !end) return undefined;
  return { start, end };
}

export interface UseIcalFeedsResult {
  feeds: IcalFeedWithRelations[];
  logs: IcalSyncLog[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createFeed: (
    input: IcalFeedCreateInput,
  ) => Promise<{ data: IcalFeedWithRelations | null; error: Error | null }>;
  updateFeed: (
    id: string,
    patch: IcalFeedUpdateInput,
  ) => Promise<{ error: Error | null }>;
  deleteFeed: (id: string) => Promise<{ error: Error | null }>;
  toggleActive: (id: string, isActive: boolean) => Promise<{ error: Error | null }>;
  triggerSync: (
    feedId: string,
  ) => Promise<{ data: IcalSyncSummary | null; error: Error | null }>;
}

export function useIcalFeeds(hostId: string | null): UseIcalFeedsResult {
  const [rawFeeds, setRawFeeds] = useState<RawIcalFeedRow[]>([]);
  const [logs, setLogs] = useState<IcalSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (showLoader: boolean = true) => {
      if (!hostId) {
        setRawFeeds([]);
        setLogs([]);
        setLoading(false);
        setError(null);
        return;
      }

      if (showLoader) setLoading(true);

      try {
        const { data: feedData, error: feedError } = await supabase
          .from('ical_feeds')
          .select(['*', 'properties(name)'].join(', '))
          .eq('host_id', hostId)
          .order('created_at', { ascending: false });

        if (feedError) throw feedError;

        const feedRows = (feedData || []) as unknown as RawIcalFeedRow[];
        setRawFeeds(feedRows);

        if (feedRows.length > 0) {
          const feedIds = feedRows.map((feed) => feed.id);
          const { data: logsData, error: logsError } = await supabase
            .from('ical_sync_logs')
            .select('*')
            .in('feed_id', feedIds)
            .order('started_at', { ascending: false });

          if (logsError) throw logsError;

          const normalizedLogs = ((logsData || []) as unknown as RawIcalSyncLogRow[]).map(normalizeLog);
          setLogs(normalizedLogs);
        } else {
          setLogs([]);
        }

        setError(null);
      } catch (fetchError) {
        console.error('[useIcalFeeds] Failed to load iCal feeds:', fetchError);
        setError(fr.ical.loadError);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [hostId],
  );

  useEffect(() => {
    void fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (!hostId) return;

    const channel = supabase
      .channel(`ical-live-${hostId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ical_feeds' },
        () => {
          void fetchData(false);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ical_sync_logs' },
        () => {
          void fetchData(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchData, hostId]);

  const feeds = useMemo<IcalFeedWithRelations[]>(() => {
    const normalizedFeeds = rawFeeds.map(normalizeFeed);
    return enrichFeedsWithRecentLogs(normalizedFeeds, logs);
  }, [logs, rawFeeds]);

  const refresh = useCallback(() => {
    void fetchData(true);
  }, [fetchData]);

  const createFeed = useCallback<UseIcalFeedsResult['createFeed']>(
    async (input) => {
      if (!hostId) return { data: null, error: new Error('Missing hostId') };

      const payload = {
        host_id: hostId,
        property_id: input.property_id,
        platform: input.platform,
        ical_url: input.ical_url.trim(),
        display_name: input.display_name?.trim() || null,
        is_active: input.is_active ?? true,
        sync_interval_minutes: input.sync_interval_minutes ?? 60,
        notes: input.notes?.trim() || null,
      };

      const { data, error: insertError } = await supabase
        .from('ical_feeds')
        .insert([payload])
        .select(['*', 'properties(name)'].join(', '))
        .single();

      if (insertError) {
        return { data: null, error: toError(insertError) };
      }

      await fetchData(false);

      return {
        data: data ? normalizeFeed(data as unknown as RawIcalFeedRow) : null,
        error: null,
      };
    },
    [fetchData, hostId],
  );

  const updateFeed = useCallback<UseIcalFeedsResult['updateFeed']>(
    async (id, patch) => {
      const updates: Record<string, unknown> = {};

      if (patch.property_id !== undefined) updates.property_id = patch.property_id;
      if (patch.platform !== undefined) updates.platform = patch.platform;
      if (patch.ical_url !== undefined) updates.ical_url = patch.ical_url.trim();
      if (patch.display_name !== undefined) updates.display_name = patch.display_name?.trim() || null;
      if (patch.is_active !== undefined) updates.is_active = patch.is_active;
      if (patch.sync_interval_minutes !== undefined) updates.sync_interval_minutes = patch.sync_interval_minutes;
      if (patch.notes !== undefined) updates.notes = patch.notes?.trim() || null;

      if (Object.keys(updates).length === 0) return { error: null };

      const { error: updateError } = await supabase
        .from('ical_feeds')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        return { error: toError(updateError) };
      }

      await fetchData(false);
      return { error: null };
    },
    [fetchData],
  );

  const deleteFeed = useCallback<UseIcalFeedsResult['deleteFeed']>(
    async (id) => {
      const { error: deleteError } = await supabase
        .from('ical_feeds')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return { error: toError(deleteError) };
      }

      await fetchData(false);
      return { error: null };
    },
    [fetchData],
  );

  const toggleActive = useCallback<UseIcalFeedsResult['toggleActive']>(
    async (id, isActive) => updateFeed(id, { is_active: isActive }),
    [updateFeed],
  );

  const finalizeLogAndFeed = useCallback(
    async (feedId: string, logId: string | null, payload: FeedFinalizePayload, eventsSummary: Record<string, unknown>) => {
      const finishedAt = new Date().toISOString();

      if (logId) {
        await supabase
          .from('ical_sync_logs')
          .update({
            finished_at: finishedAt,
            status: payload.status,
            imported_count: payload.importedCount,
            skipped_count: payload.skippedCount,
            error_message: payload.errorMessage,
            events_summary: eventsSummary,
          })
          .eq('id', logId);
      }

      await supabase
        .from('ical_feeds')
        .update({
          last_sync_at: finishedAt,
          last_sync_status: payload.status,
          last_sync_imported_count: payload.importedCount,
          last_sync_skipped_count: payload.skippedCount,
          last_sync_error: payload.errorMessage,
        })
        .eq('id', feedId);
    },
    [],
  );

  const triggerSync = useCallback<UseIcalFeedsResult['triggerSync']>(
    async (feedId) => {
      const feed = feeds.find((entry) => entry.id === feedId);
      if (!feed) {
        return {
          data: null,
          error: new Error('Feed not found'),
        };
      }

      let logId: string | null = null;
      let importedCount = 0;
      let skippedCount = 0;
      let eventsCount = 0;
      let dateRange: { start: string; end: string } | undefined;
      const errors: string[] = [];

      try {
        const { data: createdLog, error: runningLogError } = await supabase
          .from('ical_sync_logs')
          .insert([
            {
              feed_id: feed.id,
              status: 'running',
              imported_count: 0,
              skipped_count: 0,
            },
          ])
          .select('id')
          .single();

        if (runningLogError) {
          throw runningLogError;
        }

        logId = (createdLog as { id: string }).id;

        // TODO(Phase 2): Replace with an Edge Function call for server-side sync.
        let icalText = '';
        try {
          const response = await fetch(feed.ical_url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          icalText = await response.text();
        } catch (fetchError) {
          errors.push(`${fr.ical.sync.corsError} (${toError(fetchError).message})`);

          const failedPayload: FeedFinalizePayload = {
            status: 'failed',
            importedCount,
            skippedCount,
            errorMessage: errors[0] || fr.ical.sync.syncFailed,
          };

          await finalizeLogAndFeed(feed.id, logId, failedPayload, {
            events_count: eventsCount,
            date_range: null,
          });

          await fetchData(false);

          return {
            data: {
              feedId: feed.id,
              status: 'failed',
              importedCount,
              skippedCount,
              errors,
              eventsCount,
            },
            error: null,
          };
        }

        let parsedEvents;
        try {
          parsedEvents = parseIcal(icalText);
        } catch (parseError) {
          errors.push(`${fr.ical.sync.parseError} (${toError(parseError).message})`);

          const failedPayload: FeedFinalizePayload = {
            status: 'failed',
            importedCount,
            skippedCount,
            errorMessage: errors[0] || fr.ical.sync.syncFailed,
          };

          await finalizeLogAndFeed(feed.id, logId, failedPayload, {
            events_count: eventsCount,
            date_range: null,
          });

          await fetchData(false);

          return {
            data: {
              feedId: feed.id,
              status: 'failed',
              importedCount,
              skippedCount,
              errors,
              eventsCount,
            },
            error: null,
          };
        }

        eventsCount = parsedEvents.length;
        dateRange = computeDateRange(parsedEvents);

        const { data: existingRows, error: existingError } = await supabase
          .from('reservations')
          .select('external_uid')
          .eq('external_feed_id', feed.id)
          .not('external_uid', 'is', null);

        if (existingError) {
          errors.push(toError(existingError).message);
        }

        const safeExistingRows = errors.length > 0
          ? []
          : ((existingRows || []) as Array<{ external_uid: string }>);

        const { toImport, toSkip } = diffSync(parsedEvents, safeExistingRows);
        skippedCount += toSkip.length;

        for (const event of toImport) {
          const payload = eventToReservationInput(event, feed, feed.property_id);

          if (!payload) {
            skippedCount += 1;
            errors.push(`Invalid date range for event ${event.uid}`);
            continue;
          }

          const { error: insertError } = await supabase
            .from('reservations')
            .insert([payload]);

          if (insertError) {
            skippedCount += 1;
            errors.push(`[${event.uid}] ${toError(insertError).message}`);
            continue;
          }

          importedCount += 1;
        }

        const finalStatus: Exclude<IcalSyncStatus, 'running'> =
          errors.length === 0
            ? 'success'
            : importedCount > 0
              ? 'partial'
              : 'failed';

        const finalPayload: FeedFinalizePayload = {
          status: finalStatus,
          importedCount,
          skippedCount,
          errorMessage: errors[0] || null,
        };

        await finalizeLogAndFeed(feed.id, logId, finalPayload, {
          events_count: eventsCount,
          date_range: dateRange ?? null,
        });

        await fetchData(false);

        return {
          data: {
            feedId: feed.id,
            status: finalStatus,
            importedCount,
            skippedCount,
            errors,
            eventsCount,
            dateRange,
          },
          error: null,
        };
      } catch (syncError) {
        const fallbackError = toError(syncError);
        errors.push(fallbackError.message);

        try {
          await finalizeLogAndFeed(
            feed.id,
            logId,
            {
              status: 'failed',
              importedCount,
              skippedCount,
              errorMessage: errors[0] || fr.ical.sync.syncFailed,
            },
            {
              events_count: eventsCount,
              date_range: dateRange ?? null,
            },
          );
        } catch (finalizeError) {
          errors.push(toError(finalizeError).message);
        }

        await fetchData(false);

        return {
          data: {
            feedId: feed.id,
            status: 'failed',
            importedCount,
            skippedCount,
            errors,
            eventsCount,
            dateRange,
          },
          error: null,
        };
      }
    },
    [feeds, fetchData, finalizeLogAndFeed],
  );

  return {
    feeds,
    logs,
    loading,
    error,
    refresh,
    createFeed,
    updateFeed,
    deleteFeed,
    toggleActive,
    triggerSync,
  };
}
