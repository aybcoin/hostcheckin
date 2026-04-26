import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  iconButtonToken,
  modalTokens,
  stateFillTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { IcalFeedWithRelations, IcalSyncLog } from '../../types/ical';
import { Button } from '../ui/Button';

interface SyncLogsModalProps {
  isOpen: boolean;
  feed: IcalFeedWithRelations | null;
  logs: IcalSyncLog[];
  onClose: () => void;
}

const PAGE_SIZE = 10;

function statusChip(status: IcalSyncLog['status']): string {
  if (status === 'running') return statusTokens.info;
  if (status === 'partial') return statusTokens.warning;
  if (status === 'failed') return statusTokens.danger;
  return clsx('border', borderTokens.success, stateFillTokens.success, textTokens.success);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return '—';

  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(finishedAt).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return '—';

  const totalSeconds = Math.round((endMs - startMs) / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export function SyncLogsModal({ isOpen, feed, logs, onClose }: SyncLogsModalProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const feedId = feed?.id || '';

  useEffect(() => {
    if (!isOpen) return;
    setVisibleCount(PAGE_SIZE);
  }, [isOpen, feedId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const feedLogs = useMemo(
    () => logs
      .filter((log) => log.feed_id === feedId)
      .slice()
      .sort((left, right) => right.started_at.localeCompare(left.started_at)),
    [feedId, logs],
  );

  if (!isOpen || !feed) return null;

  const visibleLogs = feedLogs.slice(0, visibleCount);
  const hasMore = visibleCount < feedLogs.length;

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ical-sync-logs-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={clsx(modalTokens.panel, 'max-w-3xl')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="ical-sync-logs-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.ical.logs.title}
          </h2>
          <button
            type="button"
            aria-label={fr.ical.logs.close}
            onClick={onClose}
            className={iconButtonToken}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-5">
          {visibleLogs.length === 0 ? (
            <p className={clsx('text-sm', textTokens.muted)}>{fr.ical.logs.empty}</p>
          ) : (
            <ul className="space-y-2">
              {visibleLogs.map((log) => (
                <li key={log.id} className={clsx('rounded-lg border px-3 py-2.5', borderTokens.default)}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', statusChip(log.status))}>
                          {fr.ical.status[log.status]}
                        </span>
                        <span className={clsx('text-xs', textTokens.subtle)}>
                          {fr.ical.logs.duration}: {formatDuration(log.started_at, log.finished_at)}
                        </span>
                      </div>

                      <dl className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1 text-xs sm:grid-cols-2">
                        <div>
                          <dt className={textTokens.subtle}>{fr.ical.logs.startedAt}</dt>
                          <dd className={clsx('font-medium', textTokens.body)}>{formatDateTime(log.started_at)}</dd>
                        </div>
                        <div>
                          <dt className={textTokens.subtle}>{fr.ical.logs.finishedAt}</dt>
                          <dd className={clsx('font-medium', textTokens.body)}>{formatDateTime(log.finished_at)}</dd>
                        </div>
                        <div>
                          <dt className={textTokens.subtle}>{fr.ical.feed.imported}</dt>
                          <dd className={clsx('font-medium', textTokens.body)}>{log.imported_count}</dd>
                        </div>
                        <div>
                          <dt className={textTokens.subtle}>{fr.ical.feed.skipped}</dt>
                          <dd className={clsx('font-medium', textTokens.body)}>{log.skipped_count}</dd>
                        </div>
                      </dl>

                      {log.error_message ? (
                        <details className="mt-2 rounded-lg border px-2.5 py-2 text-xs" open={false}>
                          <summary className={clsx('cursor-pointer font-medium', textTokens.body)}>
                            {fr.ical.logs.details}
                          </summary>
                          <p className={clsx('mt-2 whitespace-pre-wrap', textTokens.muted)}>{log.error_message}</p>
                        </details>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {hasMore ? (
            <div className="flex justify-center pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
              >
                {fr.ical.logs.loadMore}
              </Button>
            </div>
          ) : null}
        </div>

        <div className={clsx('flex justify-end border-t px-5 py-3', borderTokens.default)}>
          <Button type="button" variant="tertiary" size="sm" onClick={onClose}>
            {fr.ical.logs.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
