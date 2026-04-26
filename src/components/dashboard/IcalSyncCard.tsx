import { Calendar, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { clsx } from '../../lib/clsx';
import {
  displayTokens,
  textTokens,
} from '../../lib/design-tokens';
import { formatPlatform } from '../../lib/ical-logic';
import { fr } from '../../lib/i18n/fr';
import { toast } from '../../lib/toast';
import { useIcalFeeds } from '../../hooks/useIcalFeeds';
import type { IcalFeedWithRelations, IcalPlatform } from '../../types/ical';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { DashboardWidgetCard } from './DashboardWidgetCard';

interface IcalSyncCardProps {
  hostId: string;
  onSeeAll: () => void;
}

function resolvePlatformLabel(platform: IcalPlatform): string {
  const key = formatPlatform(platform);
  const suffix = key.replace('ical.platform.', '') as IcalPlatform;
  return fr.ical.platform[suffix] || fr.ical.platform.other;
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
  const {
    feeds,
    loading,
    error,
    refresh,
    triggerSync,
  } = useIcalFeeds(hostId);
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
  const latestFeed = visibleFeeds[0];

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
    <DashboardWidgetCard
      title={fr.dashboardIcal.cardTitle}
      icon={Calendar}
      seeAllLabel={fr.dashboardIcal.cardSeeAll}
      onSeeAll={onSeeAll}
      loading={loading}
      error={error}
      onRetry={refresh}
      errorDescription={fr.errors.genericDescription}
      isEmpty={visibleFeeds.length === 0}
      emptyFallback={<p className={clsx('text-sm', textTokens.muted)}>{fr.dashboardIcal.cardEmpty}</p>}
      footer={(
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void handleSyncAll();
          }}
          disabled={syncingAll || activeFeeds.length === 0}
        >
          <RefreshCw aria-hidden size={14} className={clsx(syncingAll && 'animate-spin')} />
          {fr.dashboardIcal.syncAll}
        </Button>
      )}
    >
      <div className="space-y-1">
        <p className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>{fr.ical.feed.active}</p>
        <p className={clsx('text-2xl', displayTokens.number, textTokens.title)}>{activeFeeds.length}</p>
        <p className={clsx('text-sm', textTokens.muted)}>
          {latestFeed
            ? `${latestFeed.display_name || resolvePlatformLabel(latestFeed.platform)} · ${relativeTime(latestFeed.last_sync_at)}`
            : fr.dashboardIcal.cardEmpty}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge variant="info">{fr.ical.feed.active}: {activeFeeds.length}</StatusBadge>
        <StatusBadge variant={feedsWithErrors > 0 ? 'danger' : 'neutral'}>
          {fr.dashboardIcal.errors}: {feedsWithErrors}
        </StatusBadge>
        {latestFeed ? (
          <StatusBadge variant={latestFeed.last_sync_status === 'failed' ? 'danger' : latestFeed.last_sync_status === 'partial' ? 'warning' : 'success'}>
            {statusLabel(latestFeed)}
          </StatusBadge>
        ) : null}
      </div>
    </DashboardWidgetCard>
  );
}
