import type { PricingAction } from '../types';

interface DecisionBadgeProps {
  action: PricingAction;
}

const styles: Record<PricingAction, string> = {
  increase: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  decrease: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  hold: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

const labels: Record<PricingAction, string> = {
  increase: 'Augmenter',
  decrease: 'Baisser',
  hold: 'Garder',
};

export function DecisionBadge({ action }: DecisionBadgeProps) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${styles[action]}`}>
      {labels[action]}
    </span>
  );
}
