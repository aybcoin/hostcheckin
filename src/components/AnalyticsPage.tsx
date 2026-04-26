import { BarChart3, Download, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { clsx } from '../lib/clsx';
import { borderTokens, surfaceTokens, textTokens } from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { useAnalytics, type AnalyticsFilters } from '../hooks/useAnalytics';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import { AnalyticsPeriodPicker } from './analytics/AnalyticsPeriodPicker';
import { KpiComparisonCard } from './analytics/KpiComparisonCard';
import { LeadTimeChart } from './analytics/LeadTimeChart';
import { OccupancySparklines } from './analytics/OccupancySparklines';
import { RevenueLineChart } from './analytics/RevenueLineChart';
import { SourceDonut } from './analytics/SourceDonut';
import { formatCurrency } from '../lib/format';

interface AnalyticsPageProps {
  hostId: string;
}

function formatDays(value: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value)} j`;
}

function LoadingBlock({ height }: { height: number }) {
  return <Skeleton height={height} className="w-full rounded-xl" />;
}

export function AnalyticsPage({ hostId }: AnalyticsPageProps) {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    preset: 'last_90_days',
    propertyFilter: 'all',
  });
  const [showPrevYear, setShowPrevYear] = useState(true);
  const { summary, properties, loading, error, refresh, exportCsv } = useAnalytics(hostId, filters);

  const visibleProperties = useMemo(
    () =>
      filters.propertyFilter === 'all'
        ? properties
        : properties.filter((property) => property.id === filters.propertyFilter),
    [filters.propertyFilter, properties],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={clsx('text-2xl font-semibold', textTokens.title)}>{fr.analytics.pageTitle}</h1>
          <p className={clsx('mt-1 max-w-2xl text-sm', textTokens.muted)}>{fr.analytics.pageSubtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw aria-hidden size={14} />
            {fr.analytics.refresh}
          </Button>
          <Button variant="primary" size="sm" onClick={exportCsv} disabled={!summary}>
            <Download aria-hidden size={14} />
            {fr.analytics.exportCsv}
          </Button>
        </div>
      </header>

      <AnalyticsPeriodPicker
        preset={filters.preset}
        onChange={(preset) => setFilters((current) => ({ ...current, preset }))}
        propertyFilter={filters.propertyFilter}
        onPropertyChange={(propertyFilter) => setFilters((current) => ({ ...current, propertyFilter }))}
        properties={properties}
      />

      {error ? (
        <div className={clsx('rounded-lg border px-4 py-3 text-sm', borderTokens.danger, surfaceTokens.panel, textTokens.danger)}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingBlock key={index} height={120} />
            ))}
          </div>
          <LoadingBlock height={320} />
          <div className="grid gap-4 lg:grid-cols-2">
            <LoadingBlock height={320} />
            <LoadingBlock height={320} />
          </div>
          <LoadingBlock height={260} />
          <LoadingBlock height={260} />
        </div>
      ) : !summary ? (
        <EmptyState
          icon={<BarChart3 size={20} className={textTokens.muted} aria-hidden="true" />}
          title={fr.analytics.empty.title}
          description={fr.analytics.empty.description}
        />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KpiComparisonCard
              label={fr.analytics.kpi.revenue}
              delta={summary.kpi.revenue}
              format="currency"
            />
            <KpiComparisonCard
              label={fr.analytics.kpi.occupancy}
              delta={summary.kpi.occupancy}
              format="pct"
            />
            <KpiComparisonCard
              label={fr.analytics.kpi.avgStay}
              delta={summary.kpi.avgStay}
              format="days"
            />
            <KpiComparisonCard
              label={fr.analytics.kpi.reservations}
              delta={summary.kpi.reservations}
              format="number"
            />
          </section>

          <Card variant="default" padding="md" className={clsx('space-y-4', borderTokens.default)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={clsx('text-base font-semibold', textTokens.title)}>{fr.analytics.charts.revenueTitle}</h2>
              <label className={clsx('inline-flex items-center gap-2 text-sm', textTokens.muted)}>
                <input
                  type="checkbox"
                  checked={showPrevYear}
                  onChange={(event) => setShowPrevYear(event.target.checked)}
                />
                {fr.analytics.showPrevYear}
              </label>
            </div>
            <RevenueLineChart data={summary.revenueTrend} showPrevYear={showPrevYear} />
          </Card>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card variant="default" padding="md" className={clsx('space-y-4', borderTokens.default)}>
              <h2 className={clsx('text-base font-semibold', textTokens.title)}>{fr.analytics.charts.sourceTitle}</h2>
              <SourceDonut data={summary.sourceBreakdown} />
            </Card>

            <Card variant="default" padding="md" className={clsx('space-y-4', borderTokens.default)}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className={clsx('text-base font-semibold', textTokens.title)}>{fr.analytics.charts.leadTimeTitle}</h2>
                <div className="text-right">
                  <p className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>{fr.analytics.kpi.avgLeadTime}</p>
                  <p className={clsx('text-lg font-semibold', textTokens.title)}>{formatDays(summary.avgLeadTimeDays)}</p>
                </div>
              </div>
              <LeadTimeChart data={summary.leadTimeDist} />
            </Card>
          </section>

          <Card variant="default" padding="md" className={clsx('space-y-4', borderTokens.default)}>
            <h2 className={clsx('text-base font-semibold', textTokens.title)}>{fr.analytics.charts.occupancyTitle}</h2>
            <OccupancySparklines data={summary.occupancyTrend} properties={visibleProperties} />
          </Card>

          <Card variant="default" padding="md" className={clsx('space-y-4', borderTokens.default)}>
            <h2 className={clsx('text-base font-semibold', textTokens.title)}>{fr.analytics.charts.revpanTitle}</h2>

            {summary.revPAN.length === 0 ? (
              <div className={clsx('rounded-lg border px-4 py-6 text-sm', borderTokens.subtle, surfaceTokens.subtle, textTokens.muted)}>
                {fr.analytics.empty.description}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className={clsx('border-b', borderTokens.subtle)}>
                      <th className={clsx('px-3 py-2 text-left font-medium', textTokens.muted)}>{fr.analytics.revpan.property}</th>
                      <th className={clsx('px-3 py-2 text-right font-medium', textTokens.muted)}>{fr.analytics.revpan.revpan}</th>
                      <th className={clsx('px-3 py-2 text-right font-medium', textTokens.muted)}>{fr.analytics.revpan.revenue}</th>
                      <th className={clsx('px-3 py-2 text-right font-medium', textTokens.muted)}>{fr.analytics.revpan.availableNights}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.revPAN.map((row) => (
                      <tr key={row.propertyId} className={clsx('border-b last:border-b-0', borderTokens.subtle)}>
                        <td className={clsx('px-3 py-3 font-medium', textTokens.title)}>{row.propertyName}</td>
                        <td className={clsx('px-3 py-3 text-right', textTokens.body)}>{formatCurrency(row.revpan)}</td>
                        <td className={clsx('px-3 py-3 text-right', textTokens.body)}>{formatCurrency(row.revenue)}</td>
                        <td className={clsx('px-3 py-3 text-right', textTokens.body)}>
                          {new Intl.NumberFormat('fr-FR').format(row.availableNights)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
