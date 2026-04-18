import { Check } from 'lucide-react';

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
    <article
      className={`rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${
        recommended
          ? 'border-slate-900 ring-1 ring-slate-900'
          : 'border-slate-200'
      }`}
    >
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">{name}</h3>
          {recommended ? (
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
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

      <button
        type="button"
        className={`mt-6 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
          recommended
            ? 'bg-slate-900 text-white hover:bg-slate-800'
            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        Choisir ce plan
      </button>
    </article>
  );
}
