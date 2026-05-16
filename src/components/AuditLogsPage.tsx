import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Eye,
  FileText,
  Link2,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from '../lib/clsx';
import { logAuditEvent } from '../lib/audit-log';
import type { AuditAction, AuditLogRow } from '../lib/audit-log';
import {
  borderTokens,
  statusTokens,
  surfaceTokens,
  textTokens,
} from '../lib/design-tokens';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';

interface AuditLogsPageProps {
  hostId: string | null;
}

const ACTION_META: Record<AuditAction, { label: string; icon: LucideIcon; tone: string }> = {
  'reservation.deleted': { label: 'Réservation supprimée', icon: Trash2, tone: statusTokens.danger },
  'reservation.created': { label: 'Réservation créée', icon: ClipboardList, tone: statusTokens.success },
  'reservation.updated': { label: 'Réservation modifiée', icon: ClipboardList, tone: statusTokens.info },
  'identity.viewed': { label: 'Pièce d’identité consultée', icon: Eye, tone: statusTokens.warning },
  'identity.consent_given': { label: 'Consentement RGPD donné', icon: ShieldCheck, tone: statusTokens.success },
  'identity.uploaded': { label: 'Pièce d’identité envoyée', icon: ShieldCheck, tone: statusTokens.info },
  'contract.edited': { label: 'Contrat modifié', icon: FileText, tone: statusTokens.info },
  'contract.signed': { label: 'Contrat signé', icon: FileText, tone: statusTokens.success },
  'guest_link.shared': { label: 'Lien voyageur partagé', icon: Link2, tone: statusTokens.info },
  'guest_link.consumed': { label: 'Lien voyageur consommé', icon: Link2, tone: statusTokens.neutral },
};

function actionMeta(action: string) {
  return (
    ACTION_META[action as AuditAction] ?? {
      label: action,
      icon: ClipboardList,
      tone: statusTokens.neutral,
    }
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AuditLogsPage({ hostId }: AuditLogsPageProps) {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<'all' | AuditAction>('all');

  const fetchLogs = useCallback(async () => {
    if (!hostId) {
      setIsLoading(false);
      setLogs([]);
      return;
    }
    setIsLoading(true);
    const { data, error: queryError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (queryError) {
      console.warn('audit_logs fetch failed:', queryError);
      setError('Impossible de charger le journal d’audit.');
      setLogs([]);
    } else {
      setError(null);
      setLogs((data || []) as AuditLogRow[]);
    }
    setIsLoading(false);
  }, [hostId]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    if (actionFilter === 'all') return logs;
    return logs.filter((log) => log.action === actionFilter);
  }, [actionFilter, logs]);

  const actionOptions = useMemo(() => {
    const seen = new Set<string>();
    logs.forEach((log) => seen.add(log.action));
    return Array.from(seen) as AuditAction[];
  }, [logs]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={clsx('text-2xl font-bold', textTokens.title)}>Journal d’audit</h1>
          <p className={clsx('text-sm', textTokens.muted)}>
            Historique des actions sensibles : suppression de réservations, consultations d’identité,
            modifications de contrats, partages de liens. Conservation illimitée, immuable.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void fetchLogs()}>
          <RefreshCw size={14} className="mr-1.5" aria-hidden="true" />
          Rafraîchir
        </Button>
      </header>

      {actionOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActionFilter('all')}
            className={clsx(
              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              actionFilter === 'all' ? statusTokens.info : clsx(borderTokens.default, textTokens.muted),
            )}
          >
            Toutes ({logs.length})
          </button>
          {actionOptions.map((action) => {
            const meta = actionMeta(action);
            const Icon = meta.icon;
            const count = logs.filter((log) => log.action === action).length;
            return (
              <button
                key={action}
                type="button"
                onClick={() => setActionFilter(action)}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  actionFilter === action ? meta.tone : clsx(borderTokens.default, textTokens.muted),
                )}
              >
                <Icon size={12} aria-hidden="true" />
                {meta.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      <Card variant="default" padding="md" aria-live="polite">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((index) => (
              <Skeleton key={index} variant="text" className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={<ClipboardList className={textTokens.warning} aria-hidden="true" />}
            title="Journal indisponible"
            description={error}
            action={(
              <Button variant="secondary" onClick={() => void fetchLogs()}>
                Réessayer
              </Button>
            )}
          />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className={textTokens.subtle} aria-hidden="true" />}
            title="Aucun événement"
            description={
              actionFilter === 'all'
                ? 'Les actions sensibles apparaîtront ici dès qu’elles seront effectuées.'
                : 'Aucun événement pour ce filtre.'
            }
          />
        ) : (
          <ul role="list" className="space-y-2">
            {filteredLogs.map((log) => {
              const meta = actionMeta(log.action);
              const Icon = meta.icon;
              return (
                <li
                  key={log.id}
                  className={clsx(
                    'flex items-start gap-3 rounded-xl border p-3',
                    borderTokens.subtle,
                    surfaceTokens.subtle,
                  )}
                >
                  <span className={clsx('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', meta.tone)}>
                    <Icon size={14} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className={clsx('text-sm font-medium', textTokens.title)}>{meta.label}</p>
                      <span className={clsx('font-mono text-xs', textTokens.subtle)}>
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    {(log.target_type || log.target_id) && (
                      <p className={clsx('mt-0.5 text-xs', textTokens.muted)}>
                        {log.target_type ?? '—'}
                        {log.target_id ? ` · ${log.target_id.slice(0, 8)}…` : ''}
                      </p>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <pre className={clsx('mt-2 max-h-32 overflow-auto rounded-md p-2 text-[10px] font-mono', surfaceTokens.panel, borderTokens.default, textTokens.muted)}>
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

export { logAuditEvent };
