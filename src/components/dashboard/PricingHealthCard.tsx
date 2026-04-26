import { Wallet } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { usePricing } from '../../hooks/usePricing';
import { displayTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { summarizeRules } from '../../lib/pricing-logic';
import { StatusBadge } from '../ui/StatusBadge';
import { DashboardWidgetCard } from './DashboardWidgetCard';

interface PricingHealthCardProps {
  hostId: string;
  onSeeAll: () => void;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function PricingHealthCard({ hostId, onSeeAll }: PricingHealthCardProps) {
  const {
    rules,
    overrides,
    properties,
    loading,
    error,
    refresh,
  } = usePricing(hostId);
  const summary = summarizeRules(rules);
  const today = ymd(new Date());
  const nextThirtyDays = ymd(addDays(new Date(), 30));
  const upcomingOverrides = overrides.filter(
    (override) => override.target_date >= today && override.target_date <= nextThirtyDays,
  ).length;
  const missingBaseCount = properties.filter((property) => property.base_nightly_rate == null).length;
  const hasContent = summary.active > 0 || upcomingOverrides > 0 || properties.length > 0;

  return (
    <DashboardWidgetCard
      title={fr.dashboardPricing.cardTitle}
      icon={Wallet}
      seeAllLabel={fr.dashboardPricing.cardSeeAll}
      onSeeAll={onSeeAll}
      loading={loading}
      error={error}
      onRetry={refresh}
      errorDescription={fr.errors.genericDescription}
      isEmpty={!hasContent}
      emptyFallback={<p className={clsx('text-sm', textTokens.muted)}>{fr.dashboardPricing.cardEmpty}</p>}
    >
      <div className="space-y-1">
        <p className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>
          {fr.dashboardPricing.activeRules}
        </p>
        <p className={clsx('text-2xl', displayTokens.number, textTokens.title)}>{summary.active}</p>
        <p className={clsx('text-sm', textTokens.muted)}>
          {fr.dashboardPricing.upcomingOverrides}: {upcomingOverrides} · {fr.dashboardPricing.missingBase}: {missingBaseCount}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge variant="info">{fr.dashboardPricing.activeRules}: {summary.active}</StatusBadge>
        <StatusBadge variant="neutral">{fr.dashboardPricing.upcomingOverrides}: {upcomingOverrides}</StatusBadge>
        <StatusBadge variant={missingBaseCount > 0 ? 'warning' : 'neutral'}>
          {fr.dashboardPricing.missingBase}: {missingBaseCount}
        </StatusBadge>
      </div>
    </DashboardWidgetCard>
  );
}
