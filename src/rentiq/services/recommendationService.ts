import type { PricingFactor, PricingRecommendation } from '../types';
import { diffInDays } from '../utils/dates';

export type RecommendationMode = 'opportunities' | 'rescue';

export interface RankedRecommendation {
  recommendation: PricingRecommendation;
  mixedScore: number;
  rescueScore: number;
  proximityDays: number;
  flags: {
    orphan: boolean;
    lastMinute: boolean;
    overpricedVsCompetition: boolean;
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function factorValue(factors: PricingFactor[], key: PricingFactor['key']): number {
  return factors.find((factor) => factor.key === key)?.value ?? 1;
}

function normalizeGain(value: number): number {
  return clamp01(value / 600);
}

function proximityScore(daysUntil: number): number {
  if (daysUntil <= 1) return 1;
  if (daysUntil <= 3) return 0.9;
  if (daysUntil <= 7) return 0.7;
  if (daysUntil <= 14) return 0.45;
  return 0.2;
}

function buildRankedRecommendation(recommendation: PricingRecommendation, today: string): RankedRecommendation {
  const leadTimeFactor = factorValue(recommendation.factors, 'leadTime');
  const competitionFactor = factorValue(recommendation.factors, 'competition');
  const orphanFactor = factorValue(recommendation.factors, 'orphan');
  const daysUntil = diffInDays(today, recommendation.date);

  const flags = {
    orphan: orphanFactor < 1,
    lastMinute: leadTimeFactor < 1,
    overpricedVsCompetition: competitionFactor < 1,
  };

  const mixedScore =
    normalizeGain(recommendation.potentialGainMad) * 0.45 +
    clamp01(recommendation.opportunityScore / 100) * 0.3 +
    clamp01(recommendation.riskScore / 100) * 0.25;

  const rescueScore =
    proximityScore(daysUntil) * 0.24 +
    clamp01(recommendation.riskScore / 100) * 0.24 +
    clamp01((100 - recommendation.demandScore) / 100) * 0.18 +
    (flags.orphan ? 0.12 : 0) +
    (flags.lastMinute ? 0.12 : 0) +
    (flags.overpricedVsCompetition ? 0.1 : 0);

  return {
    recommendation,
    mixedScore: Number((mixedScore * 100).toFixed(2)),
    rescueScore: Number((rescueScore * 100).toFixed(2)),
    proximityDays: daysUntil,
    flags,
  };
}

function isRescueCandidate(item: RankedRecommendation): boolean {
  const { recommendation, flags } = item;
  return (
    recommendation.action === 'decrease' ||
    recommendation.riskScore >= 55 ||
    recommendation.demandScore <= 45 ||
    flags.orphan ||
    flags.lastMinute ||
    flags.overpricedVsCompetition
  );
}

export function rankRecommendationsForMode(
  recommendations: PricingRecommendation[],
  today: string,
  mode: RecommendationMode,
): RankedRecommendation[] {
  const ranked = recommendations.map((recommendation) => buildRankedRecommendation(recommendation, today));

  if (mode === 'opportunities') {
    return ranked
      .filter((item) => item.recommendation.action === 'increase')
      .sort((left, right) => right.mixedScore - left.mixedScore);
  }

  return ranked
    .filter(isRescueCandidate)
    .sort((left, right) => right.rescueScore - left.rescueScore);
}
