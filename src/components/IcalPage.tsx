import { useMemo, useState } from 'react';
import { Calendar, Plus, RefreshCw } from 'lucide-react';
import { clsx } from '../lib/clsx';
import {
  borderTokens,
  cardTokens,
  chipTokens,
  inputTokens,
  statusTokens,
  textTokens,
} from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { toast } from '../lib/toast';
import { useIcalFeeds } from '../hooks/useIcalFeeds';
import type { Property } from '../lib/supabase';
import type {
  IcalFeedCreateInput,
  IcalFeedUpdateInput,
  IcalFeedWithRelations,
  IcalPlatform,
} from '../types/ical';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import { CreateFeedModal } from './ical/CreateFeedModal';
import { EditFeedModal } from './ical/EditFeedModal';
import { FeedCard } from './ical/FeedCard';
import { SyncLogsModal } from './ical/SyncLogsModal';

interface IcalPageProps {
  hostId: string;
  properties: Property[];
}

type FilterMode = 'all' | 'active' | 'error' | 'by_platform';
type PropertyFilter = 'all' | string;
type PlatformFilter = 'all' | IcalPlatform;

const PLATFORM_PRIORITY: Record<IcalPlatform, number> = {
  airbnb: 0,
  booking: 1,
  vrbo: 2,
  other: 3,
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return fr.ical.status.never;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fr.ical.status.never;

  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sortFeeds(feeds: IcalFeedWithRelations[]): IcalFeedWithRelations[] {
  return feeds
    .slice()
    .sort((left, right) => {
      const byPlatform = PLATFORM_PRIORITY[left.platform] - PLATFORM_PRIORITY[right.platform];
      if (byPlatform !== 0) return byPlatform;

      const byProperty = (left.property_name || '').localeCompare(right.property_name || '', 'fr');
      if (byProperty !== 0) return byProperty;

      return (left.display_name || '').localeCompare(right.display_name || '', 'fr');
    });
}

export function IcalPage({ hostId, properties }: IcalPageProps) {
  const {
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
  } = useIcalFeeds(hostId);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [search, setSearch] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<IcalFeedWithRelations | null>(null);
  const [logsFeed, setLogsFeed] = useState<IcalFeedWithRelations | null>(null);
  const [syncingFeedIds, setSyncingFeedIds] = useState<string[]>([]);
  const [syncAllProgress, setSyncAllProgress] = useState<{ current: number; total: number } | null>(null);

  const summary = useMemo(() => {
    const totalFeeds = feeds.length;
    const activeFeeds = feeds.filter((feed) => feed.is_active).length;

    const latestSuccess = feeds
      .filter((feed) => feed.last_sync_status === 'success' && feed.last_sync_at)
      .map((feed) => feed.last_sync_at as string)
      .sort((left, right) => right.localeCompare(left))[0] || null;

    const errorCount = feeds.filter(
      (feed) => feed.last_sync_status === 'failed' || Boolean(feed.last_sync_error),
    ).length;

    return {
      totalFeeds,
      activeFeeds,
      latestSuccess,
      errorCount,
    };
  }, [feeds]);

  const filteredFeeds = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();

    const filtered = feeds
      .filter((feed) => {
        if (filter === 'all') return true;
        if (filter === 'active') return feed.is_active;
        if (filter === 'error') return feed.last_sync_status === 'failed' || Boolean(feed.last_sync_error);
        if (platformFilter === 'all') return true;
        return feed.platform === platformFilter;
      })
      .filter((feed) => (propertyFilter === 'all' ? true : feed.property_id === propertyFilter))
      .filter((feed) => {
        if (!lowerSearch) return true;
        const haystack = [
          feed.display_name,
          feed.property_name,
          feed.ical_url,
          fr.ical.platform[feed.platform],
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(lowerSearch);
      });

    return sortFeeds(filtered);
  }, [feeds, filter, platformFilter, propertyFilter, search]);

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(fr.ical.feed.copyUrl);
    } catch {
      toast.error(fr.errors.generic);
    }
  };

  const runSync = async (
    feed: IcalFeedWithRelations,
    options: { silent?: boolean } = {},
  ) => {
    setSyncingFeedIds((current) => (current.includes(feed.id) ? current : [...current, feed.id]));

    try {
      const result = await triggerSync(feed.id);
      if (result.error || !result.data) {
        if (!options.silent) toast.error(fr.ical.sync.syncFailed);
        return result.data;
      }

      const summaryData = result.data;

      if (!options.silent) {
        if (summaryData.status === 'failed') {
          const message = summaryData.errors[0] || fr.ical.sync.syncFailed;
          toast.error(message);
        } else if (summaryData.eventsCount === 0) {
          toast.info(fr.ical.sync.noEvents);
        } else if (summaryData.status === 'partial') {
          toast.warning(fr.ical.sync.syncSuccess(summaryData.importedCount, summaryData.skippedCount));
        } else {
          toast.success(fr.ical.sync.syncSuccess(summaryData.importedCount, summaryData.skippedCount));
        }
      }

      return summaryData;
    } finally {
      setSyncingFeedIds((current) => current.filter((id) => id !== feed.id));
    }
  };

  const handleSyncAll = async () => {
    const activeFeeds = sortFeeds(feeds.filter((feed) => feed.is_active));
    if (activeFeeds.length === 0) {
      toast.info(fr.ical.empty.description);
      return;
    }

    let importedTotal = 0;
    let skippedTotal = 0;

    setSyncAllProgress({ current: 0, total: activeFeeds.length });

    for (let index = 0; index < activeFeeds.length; index += 1) {
      const feed = activeFeeds[index];
      setSyncAllProgress({ current: index + 1, total: activeFeeds.length });

      const result = await runSync(feed, { silent: true });
      if (result) {
        importedTotal += result.importedCount;
        skippedTotal += result.skippedCount;
      }
    }

    setSyncAllProgress(null);
    toast.success(fr.ical.sync.syncSuccess(importedTotal, skippedTotal));
  };

  const handleCreate = async (input: IcalFeedCreateInput) => {
    const result = await createFeed(input);
    if (result.error) {
      toast.error(fr.ical.create.createError);
      return { error: result.error };
    }

    toast.success(fr.ical.create.created);
    return { error: null };
  };

  const handleUpdate = async (id: string, input: IcalFeedUpdateInput) => {
    const result = await updateFeed(id, input);
    if (result.error) {
      toast.error(fr.ical.edit.error);
      return { error: result.error };
    }

    toast.success(fr.ical.edit.saved);
    return { error: null };
  };

  const handleDelete = async (feed: IcalFeedWithRelations) => {
    if (typeof window !== 'undefined' && !window.confirm(fr.ical.confirmDelete)) return;

    const result = await deleteFeed(feed.id);
    if (result.error) {
      toast.error(fr.ical.deleteError);
      return;
    }

    toast.info(fr.ical.deleted);
  };

  const handleToggle = async (feed: IcalFeedWithRelations, isActive: boolean) => {
    const result = await toggleActive(feed.id, isActive);
    if (result.error) {
      toast.error(fr.ical.toggle.error);
      return;
    }

    toast.success(isActive ? fr.ical.toggle.activated : fr.ical.toggle.deactivated);
  };

  const filterButtons: Array<{ id: FilterMode; label: string }> = [
    { id: 'all', label: fr.ical.filters.all },
    { id: 'active', label: fr.ical.filters.active },
    { id: 'error', label: fr.ical.filters.error },
    { id: 'by_platform', label: fr.ical.filters.by_platform },
  ];

  const emptyState = !loading && !error && filteredFeeds.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={clsx('text-2xl font-semibold', textTokens.title)}>{fr.ical.pageTitle}</h1>
          <p className={clsx('mt-1 max-w-2xl text-sm', textTokens.muted)}>{fr.ical.pageSubtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw aria-hidden size={14} />
            {fr.ical.refresh}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void handleSyncAll();
            }}
            disabled={Boolean(syncAllProgress)}
          >
            <Calendar aria-hidden size={14} className={clsx(syncAllProgress && 'animate-spin')} />
            {syncAllProgress
              ? `${fr.ical.sync.syncing} (${syncAllProgress.current}/${syncAllProgress.total})`
              : fr.ical.syncAll}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus aria-hidden size={14} />
            {fr.ical.addFeed}
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label={fr.ical.summary.totalFeeds} value={summary.totalFeeds} />
        <SummaryCard label={fr.ical.summary.activeFeeds} value={summary.activeFeeds} tone="success" />
        <SummaryCard
          label={fr.ical.summary.lastSync}
          value={summary.latestSuccess ? formatDateTime(summary.latestSuccess) : fr.ical.status.never}
        />
        <SummaryCard label={fr.ical.summary.errorCount} value={summary.errorCount} tone={summary.errorCount > 0 ? 'danger' : 'neutral'} />
      </section>

      <section className={clsx('space-y-3 rounded-xl border p-3', borderTokens.default)}>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label={fr.ical.pageTitle} className="flex flex-wrap gap-1.5">
            {filterButtons.map((button) => (
              <button
                key={button.id}
                role="tab"
                type="button"
                aria-selected={filter === button.id}
                onClick={() => setFilter(button.id)}
                className={clsx(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === button.id ? chipTokens.active : chipTokens.primary,
                )}
              >
                {button.label}
              </button>
            ))}
          </div>

          <select
            value={propertyFilter}
            onChange={(event) => setPropertyFilter(event.target.value)}
            className={clsx(inputTokens.base, 'ml-auto w-auto py-1.5 text-xs')}
            aria-label={fr.ical.filters.propertyAll}
          >
            <option value="all">{fr.ical.filters.propertyAll}</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={fr.ical.filters.searchPlaceholder}
            className={clsx(inputTokens.base, 'w-72 max-w-full py-1.5 text-xs')}
            aria-label={fr.ical.filters.searchPlaceholder}
          />
        </div>

        {filter === 'by_platform' ? (
          <select
            value={platformFilter}
            onChange={(event) => setPlatformFilter(event.target.value as PlatformFilter)}
            className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
            aria-label={fr.ical.filters.platformAll}
          >
            <option value="all">{fr.ical.filters.platformAll}</option>
            <option value="airbnb">{fr.ical.platform.airbnb}</option>
            <option value="booking">{fr.ical.platform.booking}</option>
            <option value="vrbo">{fr.ical.platform.vrbo}</option>
            <option value="other">{fr.ical.platform.other}</option>
          </select>
        ) : null}
      </section>

      {error ? (
        <div className={clsx('rounded-lg border px-4 py-3 text-sm', statusTokens.danger)}>
          {fr.ical.loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} height={92} />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} height={250} />
            ))}
          </div>
        </div>
      ) : emptyState ? (
        <EmptyState
          icon={<Calendar size={20} />}
          title={fr.ical.empty.title}
          description={fr.ical.empty.description}
          action={(
            <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus aria-hidden size={14} />
              {fr.ical.empty.cta}
            </Button>
          )}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredFeeds.map((feed) => (
            <FeedCard
              key={feed.id}
              feed={feed}
              syncing={syncingFeedIds.includes(feed.id)}
              onSync={(selected) => {
                void runSync(selected);
              }}
              onSeeLogs={setLogsFeed}
              onToggleActive={(selected, active) => {
                void handleToggle(selected, active);
              }}
              onCopyUrl={(url) => {
                void handleCopyUrl(url);
              }}
              onEdit={setEditingFeed}
              onDelete={(selected) => {
                void handleDelete(selected);
              }}
            />
          ))}
        </div>
      )}

      <SyncLogsModal
        isOpen={Boolean(logsFeed)}
        feed={logsFeed}
        logs={logs}
        onClose={() => setLogsFeed(null)}
      />

      <CreateFeedModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        properties={properties}
        onSubmit={handleCreate}
      />

      <EditFeedModal
        isOpen={Boolean(editingFeed)}
        feed={editingFeed}
        properties={properties}
        onClose={() => setEditingFeed(null)}
        onSubmit={handleUpdate}
      />
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'success' | 'danger';
}

function SummaryCard({ label, value, tone = 'neutral' }: SummaryCardProps) {
  const toneClass =
    tone === 'danger'
      ? textTokens.danger
      : tone === 'success'
        ? textTokens.success
        : textTokens.title;

  return (
    <div className={clsx(cardTokens.base, cardTokens.padding.sm, 'flex flex-col')}>
      <span className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>{label}</span>
      <span className={clsx('mt-1 text-2xl font-semibold', toneClass)}>{value}</span>
    </div>
  );
}
