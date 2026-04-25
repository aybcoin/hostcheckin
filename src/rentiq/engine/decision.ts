import type { PricingAction } from '../types';

export function decidePricingAction(
  currentPrice: number,
  recommendedPrice: number,
  demandScore: number,
): PricingAction {
  if (currentPrice <= 0) return 'hold';

  const delta = recommendedPrice - currentPrice;
  const deltaPct = delta / currentPrice;

  if (Math.abs(deltaPct) < 0.05) return 'hold';
  if (deltaPct > 0.05 && demandScore > 60) return 'increase';
  if (deltaPct > 0.15) return 'increase';
  if (deltaPct < -0.05 && demandScore < 40) return 'decrease';
  if (deltaPct < -0.15) return 'decrease';

  return 'hold';
}
