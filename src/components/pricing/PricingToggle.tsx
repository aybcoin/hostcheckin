import { clsx } from '../../lib/clsx';
import { stateFillTokens, textTokens } from '../../lib/design-tokens';
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
        className={clsx(`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          billingCycle === 'monthly'
            ? 'bg-current text-white'
            : 'hover:bg-white/70'
        }`, billingCycle === 'monthly' ? textTokens.title : textTokens.muted)}
      >
        Mensuel
      </button>
      <button
        type="button"
        onClick={() => onChange('yearly')}
        className={clsx(`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          billingCycle === 'yearly'
            ? 'bg-current text-white'
            : 'hover:bg-white/70'
        }`, billingCycle === 'yearly' ? textTokens.title : textTokens.muted)}
      >
        Annuel
      </button>
      <span className={clsx('ml-2 rounded-full px-2.5 py-1 text-xs font-semibold', stateFillTokens.warning, textTokens.warning)}>
        Économisez 20 %
      </span>
    </Card>
  );
}
