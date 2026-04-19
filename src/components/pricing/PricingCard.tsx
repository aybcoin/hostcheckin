import { Check } from 'lucide-react';
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
      className={recommended ? 'border-slate-900 ring-1 ring-slate-900' : ''}
    >
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">{name}</h3>
          {recommended ? (
            <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              Recommandé
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-3xl font-bold text-slate-900">
          {amount}
          <span className="ml-1 text-base font-medium text-slate-600">{currency}</span>
        </p>
        <p className="text-sm text-slate-500">{suffix}</p>
        <p className="mt-3 text-sm text-slate-600">{positioning}</p>
      </div>

      {features.length === 0 ? (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
          Aucune fonctionnalité renseignée.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
              <Check size={16} className="mt-0.5 shrink-0 text-slate-700" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant={recommended ? 'primary' : 'secondary'} className="mt-6 w-full justify-center">
        Choisir ce plan
      </Button>
    </Card>
  );
}
