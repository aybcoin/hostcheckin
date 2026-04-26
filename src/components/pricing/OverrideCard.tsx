import { CalendarDays, Trash2 } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { PricingOverrideWithRelations } from '../../types/pricing';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatPricingAmount, formatPricingDate } from './helpers';

interface OverrideCardProps {
  override: PricingOverrideWithRelations;
  currency?: string;
  onDelete: (override: PricingOverrideWithRelations) => void;
}

export function OverrideCard({
  override,
  currency = 'EUR',
  onDelete,
}: OverrideCardProps) {
  return (
    <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <span className={clsx('inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium', statusTokens.info)}>
            <CalendarDays size={14} aria-hidden />
            {formatPricingDate(override.target_date)}
          </span>
          <div>
            <h3 className={clsx('text-base font-semibold', textTokens.title)}>
              {formatPricingAmount(override.nightly_rate, currency)}
            </h3>
            <p className={clsx('mt-1 text-sm', textTokens.muted)}>
              {override.property_name ?? fr.pricingEngine.card.scopeAll}
            </p>
          </div>
        </div>

        <Button variant="dangerSoft" size="sm" onClick={() => onDelete(override)}>
          <Trash2 size={14} aria-hidden />
          {fr.pricingEngine.actions.delete}
        </Button>
      </header>

      <p className={clsx('text-sm', textTokens.body)}>
        {override.reason || fr.pricingEngine.card.noReason}
      </p>
    </Card>
  );
}
