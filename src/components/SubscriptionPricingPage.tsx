import { useEffect, useState } from 'react';
import { clsx } from '../lib/clsx';
import { textTokens } from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { PricingCard } from './pricing/PricingCard';
import { PricingToggle } from './pricing/PricingToggle';
import { Card } from './ui/Card';

interface PricingPlan {
  name: string;
  monthly: number;
  yearly: number;
  positioning: string;
  features: string[];
  recommended?: boolean;
}

const PLANS: PricingPlan[] = [
  {
    name: fr.subscriptionPricing.plans.starter.name,
    monthly: 99,
    yearly: 950,
    positioning: fr.subscriptionPricing.plans.starter.positioning,
    features: [...fr.subscriptionPricing.plans.starter.features],
  },
  {
    name: fr.subscriptionPricing.plans.pro.name,
    monthly: 199,
    yearly: 1910,
    positioning: fr.subscriptionPricing.plans.pro.positioning,
    features: [...fr.subscriptionPricing.plans.pro.features],
    recommended: true,
  },
  {
    name: fr.subscriptionPricing.plans.business.name,
    monthly: 399,
    yearly: 3830,
    positioning: fr.subscriptionPricing.plans.business.positioning,
    features: [...fr.subscriptionPricing.plans.business.features],
  },
];

export function SubscriptionPricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const titleBefore = document.title;
    document.title = 'Abonnement | HostCheckIn';

    const descriptionMeta = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionMeta?.getAttribute('content') || '';
    if (descriptionMeta) {
      descriptionMeta.setAttribute(
        'content',
        'Découvrez les offres HostCheckIn pour digitaliser vos check-ins et contrats en toute conformité.',
      );
    }

    return () => {
      document.title = titleBefore;
      if (descriptionMeta) {
        descriptionMeta.setAttribute('content', previousDescription);
      }
    };
  }, []);

  return (
    <div className="space-y-7">
      <header className="space-y-3">
        <h1 className={clsx('text-2xl font-bold sm:text-3xl', textTokens.title)}>
          {fr.subscriptionPricing.pageTitle}
        </h1>
        <p className={clsx('text-sm sm:text-base', textTokens.muted)}>
          {fr.subscriptionPricing.pageSubtitle}
        </p>
      </header>

      <div>
        <PricingToggle billingCycle={billingCycle} onChange={setBillingCycle} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PricingCard
            key={plan.name}
            name={plan.name}
            priceMonthly={plan.monthly}
            priceYearly={plan.yearly}
            currency="MAD"
            positioning={plan.positioning}
            features={[...plan.features]}
            billingCycle={billingCycle}
            recommended={plan.recommended}
          />
        ))}
      </div>

      <Card as="footer" variant="default" padding="sm" className={clsx('text-center text-sm', textTokens.muted)}>
        {fr.subscriptionPricing.trialNote}
      </Card>
    </div>
  );
}
