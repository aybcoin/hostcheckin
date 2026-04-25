import type { PricingAction, PricingFactor } from '../types';

interface ExplanationInput {
  date: string;
  currentPrice: number;
  recommendedPrice: number;
  decision: PricingAction;
  factors: PricingFactor[];
  demandScore: number;
  riskScore: number;
  opportunityScore: number;
}

function formatAction(decision: PricingAction): string {
  if (decision === 'increase') return 'augmenter';
  if (decision === 'decrease') return 'baisser';
  return 'garder';
}

export function generatePricingExplanation(input: ExplanationInput): string {
  const topFactors = [...input.factors]
    .sort((left, right) => Math.abs(right.impactMad) - Math.abs(left.impactMad))
    .slice(0, 3)
    .map((factor) => `${factor.label} (${factor.value.toFixed(2)}x)`)
    .join(', ');

  return [
    `Le ${input.date}, la recommandation est de ${formatAction(input.decision)} le prix de ${Math.round(input.currentPrice)} MAD à ${Math.round(input.recommendedPrice)} MAD.`,
    `Facteurs dominants: ${topFactors || 'aucun signal fort'}.`,
    `Scores: demande ${input.demandScore}/100, risque ${input.riskScore}/100, opportunité ${input.opportunityScore}/100.`,
  ].join(' ');
}
