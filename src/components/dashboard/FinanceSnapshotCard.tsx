import { LineChart } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  chartTokens,
  displayTokens,
  textTokens,
} from '../../lib/design-tokens';
import { formatCurrency, resolvePeriod } from '../../lib/finance-logic';
import { fr } from '../../lib/i18n/fr';
import { useFinanceData } from '../../hooks/useFinanceData';
import { StatusBadge } from '../ui/StatusBadge';
import { DashboardWidgetCard } from './DashboardWidgetCard';

interface FinanceSnapshotCardProps {
  hostId: string;
  onSeeAll: () => void;
}

const THIS_MONTH_PERIOD = resolvePeriod('this_month');

function sparklinePath(values: number[], width: number, height: number): string {
  if (values.length === 0) return '';
  if (values.length === 1) {
    const y = height / 2;
    return `M 0 ${y} L ${width} ${y}`;
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const normalized = (value - minValue) / range;
      const y = height - normalized * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

export function FinanceSnapshotCard({ hostId, onSeeAll }: FinanceSnapshotCardProps) {
  const {
    pnl,
    loading,
    error,
    refresh,
  } = useFinanceData(hostId, THIS_MONTH_PERIOD, 'all');

  const netSeries = pnl.byMonth.map((month) => month.net).slice(-6);
  while (netSeries.length < 6) {
    netSeries.unshift(0);
  }

  const path = sparklinePath(netSeries, 180, 52);
  const hasData = pnl.revenue > 0 || pnl.expenses > 0 || pnl.transactions > 0;

  return (
    <DashboardWidgetCard
      title={fr.dashboardFinance.cardTitle}
      icon={LineChart}
      seeAllLabel={fr.dashboardFinance.cardSeeAll}
      onSeeAll={onSeeAll}
      loading={loading}
      error={error}
      onRetry={refresh}
      errorDescription={fr.errors.genericDescription}
    >
      <div className="space-y-1">
        <p className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>{fr.dashboardFinance.currentMonth}</p>
        <p className={clsx('text-2xl', displayTokens.number, textTokens.title)}>
          {hasData ? formatCurrency(pnl.revenue) : '—'}
        </p>
        <p className={clsx('text-sm', textTokens.muted)}>
          {hasData
            ? `${fr.dashboardFinance.expenses}: ${formatCurrency(pnl.expenses)} · ${fr.dashboardFinance.net}: ${formatCurrency(pnl.net)}`
            : fr.dashboardFinance.cardEmpty}
        </p>
      </div>

      {hasData ? (
        <svg viewBox="0 0 200 60" role="img" aria-label={fr.dashboardFinance.cardTitle} className="h-14 w-full">
          <line x1={0} y1={59} x2={200} y2={59} className={clsx('stroke-1', chartTokens.axis)} />
          <path d={path} fill="none" className={clsx('stroke-2', chartTokens.netStroke)} />
        </svg>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <StatusBadge variant={pnl.net >= 0 ? 'success' : 'danger'}>{fr.dashboardFinance.net}: {formatCurrency(pnl.net)}</StatusBadge>
      </div>
    </DashboardWidgetCard>
  );
}
