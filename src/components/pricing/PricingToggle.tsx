interface PricingToggleProps {
  billingCycle: 'monthly' | 'yearly';
  onChange: (cycle: 'monthly' | 'yearly') => void;
}

export function PricingToggle({ billingCycle, onChange }: PricingToggleProps) {
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          billingCycle === 'monthly'
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        Mensuel
      </button>
      <button
        type="button"
        onClick={() => onChange('yearly')}
        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
          billingCycle === 'yearly'
            ? 'bg-slate-900 text-white'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        Annuel
      </button>
      <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Économisez 20 %
      </span>
    </div>
  );
}
