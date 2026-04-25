import type { ListingPositioning } from '../../types';

const standingFactorByPositioning: Record<ListingPositioning, number> = {
  budget: 0.95,
  standard: 1,
  premium: 1.1,
  luxe: 1.2,
};

export function calculateStandingFactor(positioning: ListingPositioning): number {
  return standingFactorByPositioning[positioning] ?? 1;
}
