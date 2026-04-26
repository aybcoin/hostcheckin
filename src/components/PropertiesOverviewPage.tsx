import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Building2, RefreshCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { clsx } from '../lib/clsx';
import { borderTokens, cardTokens, ctaTokens, stateFillTokens, textTokens } from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { sortPropertyStats } from '../lib/property-stats-logic';
import type { PropertySortKey } from '../types/property-stats';
import { usePropertyStats } from '../hooks/usePropertyStats';
import { PropertyKpiCard } from './properties/PropertyKpiCard';
import { PortfolioSummaryBar } from './properties/PortfolioSummaryBar';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';

interface PropertiesOverviewPageProps {
  hostId: string;
  onNavigateToDashboard: (propertyId: string) => void;
}

function EmptyStateCard() {
  return (
    <Card variant="default" padding="lg" className="text-center">
      <div className={clsx('mx-auto flex h-12 w-12 items-center justify-center rounded-full', stateFillTokens.neutral)}>
        <Building2 size={20} className={textTokens.muted} aria-hidden="true" />
      </div>
      <h2 className={clsx('mt-4 text-lg font-semibold', textTokens.title)}>{fr.portfolio.empty.title}</h2>
      <p className={clsx('mt-2 text-sm', textTokens.muted)}>{fr.portfolio.empty.description}</p>
    </Card>
  );
}

function ErrorStateCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card variant="default" padding="lg" className="text-center">
      <div className={clsx('mx-auto flex h-12 w-12 items-center justify-center rounded-full', stateFillTokens.warning)}>
        <AlertTriangle size={20} className={textTokens.warning} aria-hidden="true" />
      </div>
      <h2 className={clsx('mt-4 text-lg font-semibold', textTokens.title)}>{fr.errors.generic}</h2>
      <p className={clsx('mt-2 text-sm', textTokens.muted)}>{message}</p>
      <div className="mt-4 flex justify-center">
        <Button variant="secondary" onClick={onRetry}>
          {fr.errors.retry}
        </Button>
      </div>
    </Card>
  );
}

const sortConfig: Array<{ key: PropertySortKey; label: string }> = [
  { key: 'name', label: fr.portfolio.sortName },
  { key: 'occupancy', label: fr.portfolio.sortOccupancy },
  { key: 'revenue', label: fr.portfolio.sortRevenue },
  { key: 'tasks', label: fr.portfolio.sortTasks },
];

export default function PropertiesOverviewPage({
  hostId,
  onNavigateToDashboard,
}: PropertiesOverviewPageProps) {
  const { properties, allStats, summary, loading, error, refresh } = usePropertyStats(hostId);
  const [sortKey, setSortKey] = useState<PropertySortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedStats = useMemo(
    () => sortPropertyStats(allStats, sortKey, sortDir),
    [allStats, sortDir, sortKey],
  );

  const handleSortChange = (nextKey: PropertySortKey) => {
    if (sortKey === nextKey) {
      setSortDir((currentDir) => (currentDir === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextKey);
    setSortDir(nextKey === 'name' ? 'asc' : 'desc');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={clsx('text-2xl font-bold sm:text-3xl', textTokens.title)}>{fr.portfolio.pageTitle}</h1>
          <p className={clsx('mt-1 text-sm sm:text-base', textTokens.muted)}>{fr.portfolio.pageSubtitle}</p>
        </div>

        <Button variant="secondary" onClick={refresh} disabled={loading}>
          <RefreshCcw size={16} className={clsx(loading && 'animate-spin')} aria-hidden="true" />
          {fr.portfolio.refresh}
        </Button>
      </header>

      <PortfolioSummaryBar summary={summary} loading={loading} />

      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={clsx('text-sm font-medium', textTokens.muted)}>{fr.portfolio.sortBy}</p>
        <div className="flex flex-wrap gap-2">
          {sortConfig.map((item) => {
            const isActive = sortKey === item.key;
            const Icon = !isActive ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSortChange(item.key)}
                className={clsx(
                  !isActive && cardTokens.base,
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isActive ? ctaTokens.primary : [borderTokens.default, textTokens.body],
                )}
              >
                {item.label}
                <Icon size={14} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </section>

      {error ? <ErrorStateCard message={error} onRetry={refresh} /> : null}

      {!error && loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="rect"
              className={clsx('h-72 rounded-xl', borderTokens.subtle)}
            />
          ))}
        </div>
      ) : null}

      {!error && !loading && properties.length === 0 ? <EmptyStateCard /> : null}

      {!error && !loading && properties.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedStats.map((stats) => (
            <PropertyKpiCard
              key={stats.propertyId}
              stats={stats}
              onSelect={() => onNavigateToDashboard(stats.propertyId)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
