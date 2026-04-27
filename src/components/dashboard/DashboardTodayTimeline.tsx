/**
 * DashboardTodayTimeline — "Aujourd'hui" timeline with left emerald/amber rail.
 * Arrival events: emerald. Departure events: amber.
 */
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, Edit3 } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  ctaTokens,
  dashboardRailTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';
import type { TodayItem } from '../../lib/dashboard-data';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';

interface TimelineRowProps {
  item: TodayItem;
  onAction: (id: string) => void;
}

function TimelineRow({ item, onAction }: TimelineRowProps) {
  const isArrival = item.type === 'arrival';
  const isDeparture = item.type === 'departure';
  const rail = isArrival ? dashboardRailTokens.success : isDeparture ? dashboardRailTokens.warning : dashboardRailTokens.neutral;
  const badgeVariant = isArrival ? 'success' as const : isDeparture ? 'warning' as const : 'neutral' as const;
  const typeLabel = isArrival ? 'Arrivée' : isDeparture ? 'Départ' : 'Action';
  const Icon = isArrival ? ArrowDownCircle : isDeparture ? ArrowUpCircle : Edit3;

  return (
    <div
      className={clsx(
        'relative flex overflow-hidden rounded-2xl border',
        surfaceTokens.panel,
        borderTokens.default,
      )}
    >
      <span aria-hidden="true" className={clsx('w-1 shrink-0', rail)} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <StatusBadge variant={badgeVariant} icon={<Icon size={12} />}>
              {typeLabel}
            </StatusBadge>
            <span className={clsx('text-xs tabular-nums', textTokens.subtle)}>{item.time}</span>
          </div>
          {item.ctaLabel && (
            <button
              type="button"
              onClick={() => onAction(item.id)}
              className={clsx(
                'shrink-0 rounded-xl px-3 py-1 text-xs font-semibold',
                item.ctaVariant === 'primary' ? ctaTokens.primary
                : item.ctaVariant === 'danger' ? ctaTokens.dangerSoft
                : ctaTokens.secondary,
              )}
            >
              {item.ctaLabel}
            </button>
          )}
          {!item.ctaLabel && (
            <button
              type="button"
              onClick={() => onAction(item.id)}
              className={clsx('shrink-0 rounded-lg p-1', textTokens.subtle)}
              aria-label="Détails"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="min-w-0">
          <p className={clsx('truncate text-sm font-semibold', textTokens.title)}>{item.guestName}</p>
          <p className={clsx('truncate text-xs', textTokens.muted)}>{item.propertyName}</p>
        </div>
      </div>
    </div>
  );
}

interface DashboardTodayTimelineProps {
  items: TodayItem[];
  onAction: (id: string) => void;
  onViewAll?: () => void;
}

export function DashboardTodayTimeline({ items, onAction, onViewAll }: DashboardTodayTimelineProps) {
  return (
    <section role="region" aria-label="Agenda du jour" className="min-w-0">
      <div className="mb-3 flex items-center justify-between">
        <h2 className={clsx('text-base font-semibold', textTokens.title)}>Aujourd'hui</h2>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className={clsx('inline-flex items-center gap-1 text-xs font-medium', textTokens.muted)}
          >
            Voir l'agenda complet
            <ChevronRight size={13} aria-hidden="true" />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<ArrowDownCircle size={18} aria-hidden="true" />}
          title="Aucun mouvement aujourd'hui"
          description="Vos arrivées et départs du jour apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <TimelineRow key={item.id} item={item} onAction={onAction} />
          ))}
        </div>
      )}
    </section>
  );
}
