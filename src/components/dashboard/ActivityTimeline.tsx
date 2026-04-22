import { AlertCircle, CheckCircle2, Lock, PlusCircle } from 'lucide-react';
import type { ActivityEvent } from '../../lib/dashboard-data';
import { clsx } from '../../lib/clsx';
import { borderTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

function timelineIcon(type: ActivityEvent['icon']) {
  if (type === 'check') return CheckCircle2;
  if (type === 'lock') return Lock;
  if (type === 'plus') return PlusCircle;
  return AlertCircle;
}

function formatTimestamp(value: Date): string {
  return value.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <section role="region" aria-label={fr.dashboard.activity.region} className="space-y-3">
      <div>
        <h2 className={clsx('text-lg font-semibold', textTokens.title)}>{fr.dashboard.activity.title}</h2>
        <p className={clsx('text-sm', textTokens.muted)}>{fr.dashboard.activity.subtitle}</p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={20} aria-hidden="true" />}
          title={fr.dashboard.activity.emptyTitle}
          description={fr.dashboard.activity.emptyDescription}
        />
      ) : (
        <Card variant="default" padding="sm" className={clsx('max-h-[25rem] overflow-y-auto p-4', borderTokens.default)}>
          <ul className="space-y-2">
            {events.slice(0, 10).map((event) => {
              const Icon = timelineIcon(event.icon);
              return (
                <li
                  key={event.id}
                  className={clsx('flex items-start gap-3 rounded-lg border p-2.5', borderTokens.subtle, surfaceTokens.subtle)}
                >
                  <span className={clsx('mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border', borderTokens.subtle, surfaceTokens.panel)}>
                    <Icon size={13} className={textTokens.muted} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className={clsx('truncate text-sm', textTokens.body)}>{event.message}</p>
                    <p className={clsx('mt-0.5 text-xs', textTokens.subtle)}>{formatTimestamp(event.timestamp)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </section>
  );
}
