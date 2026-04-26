import { clsx } from '../../lib/clsx';
import { chipTokens, stateFillTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { Card } from '../ui/Card';

interface PricingToggleProps {
  billingCycle: 'monthly' | 'yearly';
  onChange: (cycle: 'monthly' | 'yearly') => void;
}

export function PricingToggle({ billingCycle, onChange }: PricingToggleProps) {
  return (
    <Card variant="default" padding="sm" className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={clsx(
          'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
          billingCycle === 'monthly' ? chipTokens.active : chipTokens.primary,
        )}
      >
        {fr.subscriptionPricing.monthly}
      </button>
      <button
        type="button"
        onClick={() => onChange('yearly')}
        className={clsx(
          'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
          billingCycle === 'yearly' ? chipTokens.active : chipTokens.primary,
        )}
      >
        {fr.subscriptionPricing.yearly}
      </button>
      <span className={clsx('ml-2 rounded-full px-2.5 py-1 text-xs font-semibold', stateFillTokens.warning, textTokens.warning)}>
        {fr.subscriptionPricing.saveBadge}
      </span>
    </Card>
  );
}
