import { ArrowRight, Calendar, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  stateFillTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { formatPlatform } from '../../lib/ical-logic';
import { fr } from '../../lib/i18n/fr';
import { toast } from '../../lib/toast';
import { useIcalFeeds } from '../../hooks/useIcalFeeds';
import type { IcalFeedWithRelations, IcalPlatform } from '../../types/ical';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

interface IcalSyncCardProps {
  hostId: string;
  onSeeAll: () => void;
}

function resolvePlatformLabel(platform: IcalPlatform): string {
  const key = formatPlatform(platform);
  const suffix = key.replace('ical.platform.', '') as IcalPlatform;
  return fr.ical.platform[suffix] || fr.ical.platform.other;
}

function statusChip(feed: IcalFeedWithRelations): string {
  if (!feed.last_sync_at || !feed.last_sync_status) {
    return statusTokens.neutral;
  }

  if (feed.last_sync_status === 'success') {
    return clsx('border', borderTokens.success, stateFillTokens.success, textTokens.success);
  }

  if (feed.last_sync_status === 'partial') {
    return statusTokens.warning;
  }

  return statusTokens.danger;
}

function statusLabel(feed: IcalFeedWithRelations): string {
  if (!feed.last_sync_at || !feed.last_sync_status) return fr.ical.status.never;
  return fr.ical.status[feed.last_sync_status];
}

function relativeTime(value: string | null | undefined): string {
  if (!value) return fr.ical.status.never;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fr.ical.status.never;

  const diffMs = parsed.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}

function successTimestamp(feed: IcalFeedWithRelations): number {
  if (feed.last_sync_status !== 'success' || !feed.last_sync_at) return 0;
  const parsed = new Date(feed.last_sync_at).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function IcalSyncCard({ hostId, onSeeAll }: IcalSyncCardProps) {
  const { feeds, loading, triggerSync } = useIcalFeeds(hostId);
  const [syncingAll, setSyncingAll] = useState(false);

  const activeFeeds = feeds.filter((feed) => feed.is_active);
  const feedsWithErrors = feeds.filter(
    (feed) => feed.last_sync_status === 'failed' || Boolean(feed.last_sync_error),
  ).length;

  const visibleFeeds = useMemo(
    () => feeds
      .slice()
      .sort((left, right) => successTimestamp(left) - successTimestamp(right))
      .slice(0, 4),
    [feeds],
  );

  const handleSyncAll = async () => {
    if (syncingAll || activeFeeds.length === 0) return;

    setSyncingAll(true);
    try {
      let importedTotal = 0;
      let skippedTotal = 0;

      const sortedActiveFeeds = activeFeeds
        .slice()
        .sort((left, right) => successTimestamp(left) - successTimestamp(right));

      for (const feed of sortedActiveFeeds) {
        const result = await triggerSync(feed.id);
        if (result.data) {
          importedTotal += result.data.importedCount;
          skippedTotal += result.data.skippedCount;
        }
      }

      toast.success(fr.ical.sync.syncSuccess(importedTotal, skippedTotal));
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
      <header className="flex items-center justify-between gap-2">
        <h2 className={clsx('flex items-center gap-2 text-base font-semibold', textTokens.title)}>
          <Calendar aria-hidden size={16} />
          {fr.dashboardIcal.cardTitle}
        </h2>
        <Button variant="tertiary" size="sm" onClick={onSeeAll}>
          {fr.dashboardIcal.cardSeeAll}
          <ArrowRight aria-hidden size={14} />
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={clsx('rounded-full border px-2 py-0.5', statusTokens.info)}>
          {fr.ical.feed.active}: <strong>{activeFeeds.length}</strong>
        </span>
        <span className={clsx('rounded-full border px-2 py-0.5', feedsWithErrors > 0 ? statusTokens.danger : statusTokens.neutral)}>
          {fr.dashboardIcal.errors}: <strong>{feedsWithErrors}</strong>
        </span>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void handleSyncAll();
          }}
          disabled={syncingAll || activeFeeds.length === 0}
          className="ml-auto"
        >
          <RefreshCw aria-hidden size={14} className={clsx(syncingAll && 'animate-spin')} />
          {fr.dashboardIcal.syncAll}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="text" className="h-4 w-full" />
          ))}
        </div>
      ) : visibleFeeds.length === 0 ? (
        <p className={clsx('text-sm', textTokens.muted)}>{fr.dashboardIcal.cardEmpty}</p>
      ) : (
        <ul className="space-y-2">
          {visibleFeeds.map((feed) => (
            <li key={feed.id} className={clsx('flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2', borderTokens.subtle)}>
              <div className="min-w-0">
                <p className={clsx('truncate text-sm font-medium', textTokens.title)}>
                  {feed.display_name || resolvePlatformLabel(feed.platform)}
                </p>
                <p className={clsx('truncate text-xs', textTokens.muted)}>
                  {feed.property_name || '—'}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', statusChip(feed))}>
                  {statusLabel(feed)}
                </span>
                <span className={clsx('text-[11px]', textTokens.subtle)}>
                  {fr.dashboardIcal.lastSync}: {relativeTime(feed.last_sync_at)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
