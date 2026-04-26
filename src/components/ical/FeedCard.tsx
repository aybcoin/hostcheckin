import { Bed, Copy, Globe, Home, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  cardTokens,
  stateFillTokens,
  statusTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';
import { formatPlatform } from '../../lib/ical-logic';
import { fr } from '../../lib/i18n/fr';
import type { IcalFeedWithRelations, IcalPlatform } from '../../types/ical';
import { Button } from '../ui/Button';

interface FeedCardProps {
  feed: IcalFeedWithRelations;
  syncing?: boolean;
  onSync: (feed: IcalFeedWithRelations) => void;
  onSeeLogs: (feed: IcalFeedWithRelations) => void;
  onToggleActive: (feed: IcalFeedWithRelations, isActive: boolean) => void;
  onCopyUrl: (url: string) => void;
  onEdit?: (feed: IcalFeedWithRelations) => void;
  onDelete?: (feed: IcalFeedWithRelations) => void;
}

const PLATFORM_ICONS: Record<IcalPlatform, LucideIcon> = {
  airbnb: Home,
  booking: Bed,
  vrbo: Home,
  other: Globe,
};

function resolvePlatformLabel(platform: IcalPlatform): string {
  const key = formatPlatform(platform);
  const suffix = key.replace('ical.platform.', '') as IcalPlatform;
  return fr.ical.platform[suffix] || fr.ical.platform.other;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return fr.ical.feed.neverSynced;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fr.ical.feed.neverSynced;

  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusChipClass(feed: IcalFeedWithRelations, syncing: boolean): string {
  if (syncing) return statusTokens.info;

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

function statusLabel(feed: IcalFeedWithRelations, syncing: boolean): string {
  if (syncing) return fr.ical.status.running;
  if (!feed.last_sync_at || !feed.last_sync_status) return fr.ical.status.never;
  return fr.ical.status[feed.last_sync_status];
}

export function FeedCard({
  feed,
  syncing = false,
  onSync,
  onSeeLogs,
  onToggleActive,
  onCopyUrl,
  onEdit,
  onDelete,
}: FeedCardProps) {
  const PlatformIcon = PLATFORM_ICONS[feed.platform];
  const platformLabel = resolvePlatformLabel(feed.platform);

  return (
    <article
      data-testid={`ical-feed-${feed.id}`}
      className={clsx(cardTokens.base, cardTokens.padding.md, 'space-y-3', surfaceTokens.panel)}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={clsx('truncate text-base font-semibold', textTokens.title)}>
            <PlatformIcon
              aria-hidden
              size={16}
              className={clsx('mr-1.5 inline-block align-text-bottom', textTokens.muted)}
            />
            {feed.display_name || platformLabel}
          </h3>
          <p className={clsx('mt-0.5 text-sm', textTokens.muted)}>
            {feed.property_name || '—'}
          </p>
        </div>

        <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', statusChipClass(feed, syncing))}>
          {statusLabel(feed, syncing)}
        </span>
      </header>

      <div className={clsx('rounded-lg border p-2.5', borderTokens.default, surfaceTokens.subtle)}>
        <p className={clsx('text-xs font-medium', textTokens.subtle)}>{fr.ical.feed.url}</p>
        <div className="mt-1 flex items-center gap-2">
          <p className={clsx('min-w-0 flex-1 truncate text-xs', textTokens.body)} title={feed.ical_url}>
            {feed.ical_url}
          </p>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => onCopyUrl(feed.ical_url)}
            aria-label={fr.ical.feed.copyUrl}
          >
            <Copy aria-hidden size={14} />
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.neutral)}>
          <dt className={clsx('font-medium', textTokens.subtle)}>{fr.ical.feed.lastSync}</dt>
          <dd className={clsx('mt-0.5 font-medium', textTokens.body)}>{formatDateTime(feed.last_sync_at)}</dd>
        </div>
        <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.warning)}>
          <dt className={clsx('font-medium', textTokens.subtle)}>{fr.ical.feed.interval}</dt>
          <dd className={clsx('mt-0.5 font-medium', textTokens.body)}>{feed.sync_interval_minutes}</dd>
        </div>
        <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.info)}>
          <dt className={clsx('font-medium', textTokens.subtle)}>{fr.ical.feed.imported}</dt>
          <dd className={clsx('mt-0.5 text-base font-semibold', textTokens.title)}>{feed.last_sync_imported_count}</dd>
        </div>
        <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.warning)}>
          <dt className={clsx('font-medium', textTokens.subtle)}>{fr.ical.feed.skipped}</dt>
          <dd className={clsx('mt-0.5 text-base font-semibold', textTokens.title)}>{feed.last_sync_skipped_count}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-2">
        <label className={clsx('inline-flex cursor-pointer items-center gap-2 text-xs font-medium', textTokens.body)}>
          <input
            type="checkbox"
            checked={feed.is_active}
            onChange={(event) => onToggleActive(feed, event.target.checked)}
            className={clsx('h-4 w-4 rounded border', borderTokens.strong)}
          />
          {feed.is_active ? fr.ical.feed.active : fr.ical.feed.inactive}
        </label>

        <div className="flex items-center gap-2">
          {onEdit ? (
            <Button variant="secondary" size="sm" onClick={() => onEdit(feed)}>
              <Pencil aria-hidden size={14} />
              {fr.ical.actions.edit}
            </Button>
          ) : null}
          {onDelete ? (
            <Button variant="dangerSoft" size="sm" onClick={() => onDelete(feed)}>
              <Trash2 aria-hidden size={14} />
              {fr.ical.actions.delete}
            </Button>
          ) : null}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onSync(feed)}
          disabled={syncing}
        >
          <RefreshCw aria-hidden size={14} className={clsx(syncing && 'animate-spin')} />
          {fr.ical.feed.syncNow}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => onSeeLogs(feed)}>
          {fr.ical.feed.seeLogs}
        </Button>
      </footer>
    </article>
  );
}
