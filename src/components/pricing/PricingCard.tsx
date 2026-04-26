import { Check } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface PricingCardProps {
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  positioning: string;
  features: string[];
  billingCycle: 'monthly' | 'yearly';
  recommended?: boolean;
}

export function PricingCard({
  name,
  priceMonthly,
  priceYearly,
  currency,
  positioning,
  features,
  billingCycle,
  recommended = false,
}: PricingCardProps) {
  const amount = billingCycle === 'monthly' ? priceMonthly : priceYearly;
  const suffix = billingCycle === 'monthly' ? '/mois' : '/an';

  return (
    <Card
      as="article"
      variant={recommended ? 'highlight' : 'default'}
      padding="lg"
      interactive
      className={recommended ? clsx(borderTokens.strong) : ''}
    >
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <h3 className={clsx('text-xl font-semibold', textTokens.title)}>{name}</h3>
          {recommended ? (
            <span className={clsx('rounded-full border px-3 py-1 text-xs font-medium', borderTokens.strong, surfaceTokens.subtle, textTokens.body)}>
              {fr.subscriptionPricing.recommended}
            </span>
          ) : null}
        </div>
        <p className={clsx('mt-3 text-3xl font-bold', textTokens.title)}>
          {amount}
          <span className={clsx('ml-1 text-base font-medium', textTokens.muted)}>{currency}</span>
        </p>
        <p className={clsx('text-sm', textTokens.subtle)}>{suffix}</p>
        <p className={clsx('mt-3 text-sm', textTokens.muted)}>{positioning}</p>
      </div>

      {features.length === 0 ? (
        <p className={clsx('rounded-lg p-3 text-sm', surfaceTokens.subtle, textTokens.subtle)}>
          {fr.subscriptionPricing.noFeatures}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {features.map((feature) => (
            <li key={feature} className={clsx('flex items-start gap-2 text-sm', textTokens.body)}>
              <Check size={16} className={clsx('mt-0.5 shrink-0', textTokens.body)} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant={recommended ? 'primary' : 'secondary'} className="mt-6 w-full justify-center">
        {fr.subscriptionPricing.choosePlan}
      </Button>
    </Card>
  );
}
