import { clsx } from '../../lib/clsx';
import { borderTokens, statusTokens, warningTokens } from '../../lib/design-tokens';
import { formatCurrency } from '../../lib/format';
import { fr } from '../../lib/i18n/fr';
import { formatOccupancyPct } from '../../lib/property-stats-logic';
import type { PropertyStatsSummary } from '../../types/property-stats';
import { Skeleton } from '../ui/Skeleton';

interface PortfolioSummaryBarProps {
  summary: PropertyStatsSummary;
  loading?: boolean;
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={clsx('rounded-full border px-4 py-3', tone)}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export function PortfolioSummaryBar({ summary, loading = false }: PortfolioSummaryBarProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="rect" className={clsx('h-20 rounded-full', borderTokens.subtle)} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryChip
        label={fr.portfolio.summary.totalProperties}
        value={new Intl.NumberFormat('fr-FR').format(summary.totalProperties)}
        tone={statusTokens.neutral}
      />
      <SummaryChip
        label={fr.portfolio.summary.avgOccupancy}
        value={formatOccupancyPct(summary.avgOccupancyRate)}
        tone={statusTokens.neutral}
      />
      <SummaryChip
        label={fr.portfolio.summary.totalRevenue}
        value={formatCurrency(summary.totalRevenueThisMonth)}
        tone={statusTokens.neutral}
      />
      <SummaryChip
        label={fr.portfolio.summary.urgentTickets}
        value={new Intl.NumberFormat('fr-FR').format(summary.totalUrgentTickets)}
        tone={summary.totalUrgentTickets > 0 ? warningTokens.status : statusTokens.neutral}
      />
    </div>
  );
}
