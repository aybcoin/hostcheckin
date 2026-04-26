import { ArrowRight, Wallet } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { usePricing } from '../../hooks/usePricing';
import { borderTokens, statusTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { summarizeRules } from '../../lib/pricing-logic';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

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
  const { rules, overrides, properties, loading } = usePricing(hostId);
  const summary = summarizeRules(rules);
  const today = ymd(new Date());
  const nextThirtyDays = ymd(addDays(new Date(), 30));
  const upcomingOverrides = overrides.filter(
    (override) => override.target_date >= today && override.target_date <= nextThirtyDays,
  ).length;
  const missingBaseCount = properties.filter((property) => property.base_nightly_rate == null).length;
  const hasContent = summary.active > 0 || upcomingOverrides > 0 || properties.length > 0;

  return (
    <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
      <header className="flex items-center justify-between gap-2">
        <h2 className={clsx('flex items-center gap-2 text-base font-semibold', textTokens.title)}>
          <Wallet aria-hidden size={16} />
          {fr.dashboardPricing.cardTitle}
        </h2>
        <Button variant="tertiary" size="sm" onClick={onSeeAll}>
          {fr.dashboardPricing.cardSeeAll}
          <ArrowRight aria-hidden size={14} />
        </Button>
      </header>

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="text" className="h-4 w-full" />
          ))}
        </div>
      ) : !hasContent ? (
        <p className={clsx('text-sm', textTokens.muted)}>{fr.dashboardPricing.cardEmpty}</p>
      ) : (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={clsx('rounded-full border px-2 py-0.5', statusTokens.info)}>
            {fr.dashboardPricing.activeRules}: <strong>{summary.active}</strong>
          </span>
          <span className={clsx('rounded-full border px-2 py-0.5', statusTokens.neutral)}>
            {fr.dashboardPricing.upcomingOverrides}: <strong>{upcomingOverrides}</strong>
          </span>
          <span className={clsx('rounded-full border px-2 py-0.5', missingBaseCount > 0 ? statusTokens.warning : statusTokens.neutral)}>
            {fr.dashboardPricing.missingBase}: <strong>{missingBaseCount}</strong>
          </span>
        </div>
      )}
    </Card>
  );
}
