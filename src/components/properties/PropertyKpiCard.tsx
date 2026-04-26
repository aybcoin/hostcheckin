import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, cardTokens, statusTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { formatCurrency, formatShortDate } from '../../lib/format';
import { fr } from '../../lib/i18n/fr';
import type { PropertyStats } from '../../types/property-stats';
import { OccupancyBar } from './OccupancyBar';

interface PropertyKpiCardProps {
  stats: PropertyStats;
  onSelect?: () => void;
  selected?: boolean;
}

const SELECTED_RING_TOKEN = borderTokens.strong.replace('border-', 'ring-');

function StatBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx('rounded-xl border p-3', borderTokens.subtle, surfaceTokens.subtle)}>
      <p className={clsx('text-xs font-medium', textTokens.muted)}>{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function CountChip({
  value,
  tone,
}: {
  value: number;
  tone: string;
}) {
  return (
    <span className={clsx('inline-flex rounded-full border px-2.5 py-1 text-sm font-semibold', tone)}>
      {value}
    </span>
  );
}

export function PropertyKpiCard({ stats, onSelect, selected = false }: PropertyKpiCardProps) {
  const houseKeepingTone = stats.pendingHousekeepingTasks > 0 ? statusTokens.warning : statusTokens.neutral;
  const maintenanceTone = stats.urgentMaintenanceTickets > 0 ? statusTokens.danger : statusTokens.neutral;
  const className = clsx(
    cardTokens.base,
    selected ? cardTokens.elevated : cardTokens.variants.default,
    cardTokens.padding.md,
    onSelect && cardTokens.interactive,
    onSelect && 'w-full text-left',
    selected && 'ring-2',
    selected && SELECTED_RING_TOKEN,
    selected && borderTokens.strong,
    'space-y-4',
  );

  const content = (
    <>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={clsx('truncate text-lg font-semibold', textTokens.title)}>{stats.propertyName}</h3>
          <span className={clsx('mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium', borderTokens.subtle, surfaceTokens.subtle, textTokens.muted)}>
            {stats.city}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatBlock label={fr.portfolio.card.occupancyLabel}>
          <OccupancyBar rate={stats.occupancyThisMonth.rate} size="md" />
        </StatBlock>

        <StatBlock label={fr.portfolio.card.revenueLabel}>
          <p className={clsx('text-lg font-semibold', textTokens.title)}>
            {formatCurrency(stats.revenueThisMonth)}
          </p>
        </StatBlock>

        <StatBlock label={fr.portfolio.card.housekeepingLabel}>
          <CountChip value={stats.pendingHousekeepingTasks} tone={houseKeepingTone} />
        </StatBlock>

        <StatBlock label={fr.portfolio.card.maintenanceLabel}>
          <CountChip value={stats.urgentMaintenanceTickets} tone={maintenanceTone} />
        </StatBlock>
      </div>

      <footer className={clsx('flex items-center justify-between gap-3 border-t pt-4', borderTokens.subtle)}>
        <div className="min-w-0">
          <p className={clsx('text-xs font-medium', textTokens.muted)}>{fr.portfolio.card.nextCheckin}</p>
          <p className={clsx('mt-1 text-sm font-medium', textTokens.title)}>
            {stats.nextCheckin ? formatShortDate(stats.nextCheckin) : fr.portfolio.card.noDate}
          </p>
        </div>
        {onSelect ? (
          <span className={clsx('inline-flex items-center gap-1 text-sm font-medium', textTokens.title)}>
            {fr.portfolio.card.viewDashboard}
            <ArrowRight size={14} aria-hidden="true" />
          </span>
        ) : null}
      </footer>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={className}
        data-testid={`property-kpi-card-${stats.propertyId}`}
      >
        {content}
      </button>
    );
  }

  return (
    <article className={className} data-testid={`property-kpi-card-${stats.propertyId}`}>
      {content}
    </article>
  );
}
