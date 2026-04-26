import { ArrowRight, LineChart } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, chartTokens, textTokens } from '../../lib/design-tokens';
import { formatCurrency, resolvePeriod } from '../../lib/finance-logic';
import { fr } from '../../lib/i18n/fr';
import { useFinanceData } from '../../hooks/useFinanceData';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

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
  const { pnl, loading } = useFinanceData(hostId, THIS_MONTH_PERIOD, 'all');

  const netSeries = pnl.byMonth.map((month) => month.net).slice(-6);
  while (netSeries.length < 6) {
    netSeries.unshift(0);
  }

  const path = sparklinePath(netSeries, 180, 52);
  const hasData = pnl.revenue > 0 || pnl.expenses > 0 || pnl.transactions > 0;

  return (
    <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
      <header className="flex items-center justify-between gap-2">
        <h2 className={clsx('flex items-center gap-2 text-base font-semibold', textTokens.title)}>
          <LineChart aria-hidden size={16} />
          {fr.dashboardFinance.cardTitle}
        </h2>
        <Button variant="tertiary" size="sm" onClick={onSeeAll}>
          {fr.dashboardFinance.cardSeeAll}
          <ArrowRight aria-hidden size={14} />
        </Button>
      </header>

      <p className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>{fr.dashboardFinance.currentMonth}</p>

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          <Skeleton variant="text" className="h-4 w-full" />
          <Skeleton variant="text" className="h-4 w-4/5" />
          <Skeleton variant="rect" className="h-14 w-full rounded-lg" />
        </div>
      ) : !hasData ? (
        <p className={clsx('text-sm', textTokens.muted)}>{fr.dashboardFinance.cardEmpty}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <MiniKpi label={fr.dashboardFinance.revenue} value={formatCurrency(pnl.revenue)} />
            <MiniKpi label={fr.dashboardFinance.expenses} value={formatCurrency(pnl.expenses)} />
            <MiniKpi label={fr.dashboardFinance.net} value={formatCurrency(pnl.net)} net={pnl.net} />
          </div>

          <svg viewBox="0 0 200 60" role="img" aria-label={fr.dashboardFinance.cardTitle} className="h-14 w-full">
            <line x1={0} y1={59} x2={200} y2={59} className={clsx('stroke-1', chartTokens.axis)} />
            <path d={path} fill="none" className={clsx('stroke-2', chartTokens.netStroke)} />
          </svg>
        </>
      )}
    </Card>
  );
}

interface MiniKpiProps {
  label: string;
  value: string;
  net?: number;
}

function MiniKpi({ label, value, net }: MiniKpiProps) {
  const valueClass =
    typeof net === 'number'
      ? net >= 0
        ? textTokens.success
        : textTokens.danger
      : textTokens.title;

  return (
    <div className={clsx('rounded-lg border px-2 py-2', borderTokens.subtle)}>
      <p className={clsx('text-[11px]', textTokens.subtle)}>{label}</p>
      <p className={clsx('text-sm font-semibold', valueClass)}>{value}</p>
    </div>
  );
}
