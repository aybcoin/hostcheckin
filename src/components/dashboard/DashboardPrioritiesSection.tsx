/**
 * DashboardPrioritiesSection — "Actions prioritaires aujourd'hui"
 * 3 horizontal urgency cards with a colored left rail.
 * Matches the Payoneer-style mockup section.
 */
import { ArrowRight, Clock3 } from 'lucide-react';
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

interface PriorityCardProps {
  type: TodayItem['type'];
  urgency: TodayItem['urgency'];
  time?: string;
  guestName: string;
  propertyName: string;
  ctaLabel?: string;
  ctaVariant?: TodayItem['ctaVariant'];
  onAction?: () => void;
}

function railColor(urgency: TodayItem['urgency'], type: TodayItem['type']): string {
  if (urgency === 'critical') return dashboardRailTokens.danger;
  if (urgency === 'high' || type === 'arrival') return dashboardRailTokens.warning;
  return dashboardRailTokens.info;
}

function typeLabel(type: TodayItem['type']): string {
  if (type === 'arrival') return 'Arrivée';
  if (type === 'departure') return 'Départ';
  return 'Action';
}

function badgeVariant(urgency: TodayItem['urgency']): 'danger' | 'warning' | 'neutral' {
  if (urgency === 'critical') return 'danger';
  if (urgency === 'high') return 'warning';
  return 'neutral';
}

function PriorityCard({ type, urgency, time, guestName, propertyName, ctaLabel, ctaVariant, onAction }: PriorityCardProps) {
  const rail = railColor(urgency, type);
  const ctaClass =
    ctaVariant === 'danger' ? ctaTokens.dangerSoft
    : ctaVariant === 'primary' ? ctaTokens.primary
    : ctaTokens.secondary;

  return (
    <div
      className={clsx(
        'relative flex overflow-hidden rounded-2xl border',
        surfaceTokens.panel,
        borderTokens.default,
      )}
    >
      {/* Left urgency rail */}
      <span aria-hidden="true" className={clsx('w-1 shrink-0', rail)} />

      <div className="flex flex-1 items-center justify-between gap-4 p-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <StatusBadge variant={badgeVariant(urgency)} size="sm">
              {typeLabel(type)}
            </StatusBadge>
            {time && (
              <span className={clsx('flex items-center gap-1 text-xs', textTokens.subtle)}>
                <Clock3 size={11} aria-hidden="true" />
                {time}
              </span>
            )}
          </div>
          <p className={clsx('truncate text-sm font-semibold', textTokens.title)}>{guestName}</p>
          <p className={clsx('truncate text-xs', textTokens.muted)}>{propertyName}</p>
        </div>
        {ctaLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className={clsx(
              'shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors duration-200',
              ctaClass,
            )}
          >
            {ctaLabel}
          </button>
        )}
        {!ctaLabel && (
          <ArrowRight size={16} aria-hidden="true" className={textTokens.subtle} />
        )}
      </div>
    </div>
  );
}

interface DashboardPrioritiesSectionProps {
  items: TodayItem[];
  onAction: (id: string) => void;
  onViewAll?: () => void;
}

export function DashboardPrioritiesSection({ items, onAction, onViewAll }: DashboardPrioritiesSectionProps) {
  if (items.length === 0) return null;

  const urgentCount = items.filter((i) => i.urgency === 'critical' || i.urgency === 'high').length;
  const visibleItems = items.slice(0, 3);

  return (
    <section role="region" aria-label="Actions prioritaires aujourd'hui">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className={clsx('text-base font-semibold', textTokens.title)}>
            Actions prioritaires aujourd'hui
          </h2>
          {urgentCount > 0 && (
            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
              {urgentCount} urgent{urgentCount > 1 ? 'es' : 'e'}
            </span>
          )}
        </div>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className={clsx('inline-flex items-center gap-1 text-xs font-medium', textTokens.muted)}
          >
            Voir toutes les actions
            <ArrowRight size={13} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {visibleItems.map((item) => (
          <PriorityCard
            key={item.id}
            type={item.type}
            urgency={item.urgency}
            time={item.time}
            guestName={item.guestName}
            propertyName={item.propertyName}
            ctaLabel={item.ctaLabel}
            ctaVariant={item.ctaVariant}
            onAction={() => onAction(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
