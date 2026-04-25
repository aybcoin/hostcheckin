import type { Booking, PricingFactor } from '../types';
import { diffInDays } from '../utils/dates';
import { clampPrice } from './bounds';
import { decidePricingAction } from './decision';
import { generatePricingExplanation } from './explanation';
import { calculateCompetitionFactor } from './factors/competition';
import { calculateEventFactor } from './factors/event';
import { calculateLeadTimeFactor } from './factors/leadTime';
import { calculateLocalDemandFactor } from './factors/localDemand';
import { calculateOccupancyFactor } from './factors/occupancy';
import { calculateOrphanFactor } from './factors/orphan';
import { calculateSeasonFactor } from './factors/season';
import { calculateStandingFactor } from './factors/standing';
import { calculateWeekendFactor } from './factors/weekend';
import { clampScore, getDayStatus, normalize, roundPrice } from './helpers';
import type { FactorBundle, PricingEngineInput, PricingEngineResult } from './types';

const FACTOR_ORDER: Array<keyof FactorBundle> = [
  'season',
  'weekend',
  'leadTime',
  'occupancy',
  'competition',
  'event',
  'orphan',
  'standing',
  'localDemand',
];

const FACTOR_LABELS: Record<keyof FactorBundle, string> = {
  season: 'Saisonnalité',
  weekend: 'Week-end',
  leadTime: 'Délai avant arrivée',
  occupancy: 'Occupation fenêtre ±21j',
  competition: 'Concurrence locale',
  event: 'Événements locaux',
  orphan: 'Nuit orpheline',
  standing: 'Standing logement',
  localDemand: 'Demande locale',
};

function factorReason(key: keyof FactorBundle, value: number): string {
  if (key === 'season') {
    return value >= 1 ? 'Saison forte sur la zone' : 'Saison creuse sur la zone';
  }
  if (key === 'weekend') {
    return value > 1 ? 'Prime week-end active' : 'Jour de semaine standard';
  }
  if (key === 'leadTime') {
    return value < 1 ? 'Dernière minute: ajustement pour conversion' : 'Fenêtre de pickup favorable';
  }
  if (key === 'occupancy') {
    return value >= 1 ? 'Occupation future soutenue' : 'Occupation faible, besoin de conversion';
  }
  if (key === 'competition') {
    return value >= 1 ? 'Prix compétitif vs marché' : 'Prix au-dessus de la médiane concurrente';
  }
  if (key === 'event') {
    return value > 1 ? 'Événement local avec effet demande' : 'Aucun événement significatif';
  }
  if (key === 'orphan') {
    return value < 1 ? 'Nuit orpheline détectée, discount tactique' : 'Aucune nuit orpheline';
  }
  if (key === 'standing') {
    return value > 1 ? 'Positionnement premium/luxe' : 'Positionnement prudent';
  }
  if (value === 1) {
    return 'Signal local neutre (mode prudent MVP)';
  }
  return value > 1 ? 'Signal local manuel positif' : 'Signal local manuel prudent';
}

function buildFactorList(basePrice: number, factors: FactorBundle): PricingFactor[] {
  const result: PricingFactor[] = [];
  let runningPrice = basePrice;

  for (const key of FACTOR_ORDER) {
    const value = factors[key];
    const nextPrice = runningPrice * value;
    result.push({
      key,
      label: FACTOR_LABELS[key],
      value,
      impactMad: roundPrice(nextPrice - runningPrice),
      reason: factorReason(key, value),
    });
    runningPrice = nextPrice;
  }

  return result;
}

function computeCancellationRatio(bookings: Booking[], listingId: string): number {
  const listingBookings = bookings.filter((booking) => booking.listingId === listingId);
  if (listingBookings.length === 0) return 0;
  const cancellations = listingBookings.filter((booking) => booking.status === 'cancelled').length;
  return cancellations / listingBookings.length;
}

function computeDemandScore(factors: FactorBundle): number {
  const eventSignal = normalize(factors.event, 1, 1.8);
  const occupancySignal = normalize(factors.occupancy, 0.9, 1.3);
  const localSignal = normalize(factors.localDemand, 1, 1.08);
  const seasonSignal = normalize(factors.season, 0.65, 1.85);
  const weekendSignal = normalize(factors.weekend, 1, 1.3);

  return clampScore((
    eventSignal * 0.35 +
    occupancySignal * 0.25 +
    localSignal * 0.05 +
    seasonSignal * 0.2 +
    weekendSignal * 0.15
  ) * 100);
}

function computeRiskScore(params: {
  daysUntilArrival: number;
  competitionFactor: number;
  orphanFactor: number;
  cancellationRatio: number;
}): number {
  const proximityScore = params.daysUntilArrival <= 1
    ? 100
    : params.daysUntilArrival <= 3
      ? 80
      : params.daysUntilArrival <= 7
        ? 60
        : params.daysUntilArrival <= 14
          ? 40
          : 20;

  const competitionGap = params.competitionFactor < 1
    ? normalize(1 - params.competitionFactor, 0, 0.15) * 100
    : 10;

  const orphanScore = params.orphanFactor < 1 ? 85 : 20;
  const cancellationScore = Math.min(100, Math.round(params.cancellationRatio * 100));

  return clampScore(
    proximityScore * 0.4 + competitionGap * 0.3 + orphanScore * 0.2 + cancellationScore * 0.1,
  );
}

function computeOpportunityScore(params: {
  demandScore: number;
  riskScore: number;
  recommendedPrice: number;
  minPrice: number;
  maxPrice: number;
}): number {
  const range = Math.max(1, params.maxPrice - params.minPrice);
  const marginOfMaxPrice = normalize(params.maxPrice - params.recommendedPrice, 0, range);

  return clampScore(
    params.demandScore * 0.5 -
      params.riskScore * 0.3 +
      marginOfMaxPrice * 100 * 0.2,
  );
}

export function calculateRecommendedPrice(input: PricingEngineInput): PricingEngineResult {
  const listingBookings = input.bookingsAlreadyFiltered
    ? input.bookings
    : input.bookings.filter((booking) => booking.listingId === input.listing.id);
  const status = getDayStatus(input.date, listingBookings);

  const season = calculateSeasonFactor(input.date, input.listing.zone);
  const weekend = calculateWeekendFactor(input.date);
  const leadTime = calculateLeadTimeFactor(input.date, input.today);
  const occupancy = calculateOccupancyFactor({
    date: input.date,
    listingId: input.listing.id,
    bookings: listingBookings,
  });
  const competition = calculateCompetitionFactor({
    date: input.date,
    listing: input.listing,
    currentPrice: input.currentPrice,
    competitors: input.competitors,
  });
  const event = calculateEventFactor({
    date: input.date,
    zone: input.listing.zone,
    events: input.events,
  });
  const orphan = calculateOrphanFactor({ date: input.date, bookings: listingBookings });
  const standing = calculateStandingFactor(input.listing.positioning);
  const localDemand = calculateLocalDemandFactor({
    seasonFactor: season,
    eventFactor: event,
    occupancyFactor: occupancy,
  });

  const factors: FactorBundle = {
    season,
    weekend,
    leadTime,
    occupancy,
    competition,
    event,
    orphan,
    standing,
    localDemand,
  };

  const rawRecommendedPrice = input.listing.basePrice *
    factors.season *
    factors.weekend *
    factors.leadTime *
    factors.occupancy *
    factors.competition *
    factors.event *
    factors.orphan *
    factors.standing *
    factors.localDemand;

  const boundedRecommendedPrice = clampPrice(rawRecommendedPrice, input.listing.minPrice, input.listing.maxPrice);
  const demandScore = computeDemandScore(factors);
  const daysUntilArrival = diffInDays(input.today, input.date);
  const cancellationRatio = computeCancellationRatio(listingBookings, input.listing.id);
  const riskScore = computeRiskScore({
    daysUntilArrival,
    competitionFactor: competition,
    orphanFactor: orphan,
    cancellationRatio,
  });
  const opportunityScore = computeOpportunityScore({
    demandScore,
    riskScore,
    recommendedPrice: boundedRecommendedPrice,
    minPrice: input.listing.minPrice,
    maxPrice: input.listing.maxPrice,
  });

  const factorList = buildFactorList(input.listing.basePrice, factors);
  const decision = status === 'free'
    ? decidePricingAction(input.currentPrice, boundedRecommendedPrice, demandScore)
    : 'hold';

  const potentialGainMad = status === 'free'
    ? Math.max(0, roundPrice(boundedRecommendedPrice - input.currentPrice))
    : 0;

  const explanation = generatePricingExplanation({
    date: input.date,
    currentPrice: input.currentPrice,
    recommendedPrice: boundedRecommendedPrice,
    decision,
    factors: factorList,
    demandScore,
    riskScore,
    opportunityScore,
  });

  return {
    listingId: input.listing.id,
    date: input.date,
    status,
    basePrice: input.listing.basePrice,
    currentPrice: input.currentPrice,
    rawRecommendedPrice: roundPrice(rawRecommendedPrice),
    recommendedPrice: boundedRecommendedPrice,
    decision,
    demandScore,
    riskScore,
    opportunityScore,
    potentialGainMad,
    factors: factorList,
    explanation,
  };
}
