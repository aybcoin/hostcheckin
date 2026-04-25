import { calculateRecommendedPrice } from './pricing';
import { addDays, diffInDays, eachDay } from '../utils/dates';
import type {
  BacktestInput,
  BacktestRunInput,
  BacktestNightRecord,
  BacktestOpportunityItem,
  BacktestRiskItem,
  BacktestRunResult,
  BacktestScenario,
  BacktestScenarioResult,
  Booking,
  DailyPricing,
  PricingFactor,
} from '../types';

const BOOKED_STATUSES: Booking['status'][] = ['confirmed', 'completed'];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function isNightBooked(booking: Booking, date: string): boolean {
  if (!BOOKED_STATUSES.includes(booking.status)) return false;
  const lastNight = addDays(booking.checkOut, -1);
  return date >= booking.checkIn && date <= lastNight;
}

function buildRealNightPriceMap(bookings: Booking[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const booking of bookings) {
    if (!BOOKED_STATUSES.includes(booking.status)) continue;

    const nights = diffInDays(booking.checkIn, booking.checkOut);
    if (nights <= 0) continue;

    for (let offset = 0; offset < nights; offset += 1) {
      const nightDate = addDays(booking.checkIn, offset);
      map.set(nightDate, booking.pricePerNight);
    }
  }

  return map;
}

function getFactorValue(factors: PricingFactor[], key: PricingFactor['key']): number {
  const factor = factors.find((item) => item.key === key);
  return factor?.value ?? 1;
}

function computeAvailabilityDays(bookings: Booking[], dates: string[]): number {
  const blockedDates = new Set<string>();

  for (const booking of bookings) {
    if (booking.status !== 'blocked') continue;
    const nights = diffInDays(booking.checkIn, booking.checkOut);
    if (nights <= 0) continue;

    for (let offset = 0; offset < nights; offset += 1) {
      blockedDates.add(addDays(booking.checkIn, offset));
    }
  }

  return dates.filter((date) => !blockedDates.has(date)).length;
}

function describeOpportunity(rec: BacktestNightRecord): string {
  if (rec.demandScore >= 75) return 'Forte demande non monétisée';
  if (rec.decision === 'increase') return 'Hausse recommandée non appliquée';
  return 'Sous-valorisation potentielle';
}

function describeRisk(rec: BacktestNightRecord): string {
  if (rec.riskScore >= 70) return 'Risque élevé de nuit vide';
  if (rec.decision === 'increase') return 'Hausse potentiellement trop agressive';
  return 'Signal de prudence marché';
}

function scenarioPriceToleranceMultiplier(scenario: BacktestScenario): number {
  if (scenario === 'prudent') return 0.8;
  if (scenario === 'aggressive') return 1.2;
  return 1;
}

function demandToleranceBoost(demandScore: number, seasonFactor: number): number {
  const demandBoost = demandScore >= 70 ? 0.08 : demandScore >= 55 ? 0.03 : -0.04;
  const seasonBoost = seasonFactor >= 1.2 ? 0.06 : seasonFactor <= 0.9 ? -0.05 : 0;
  return demandBoost + seasonBoost;
}

export function estimateBookingProbabilityImpact(
  realPrice: number,
  recommendedPrice: number,
  demandScore: number,
  riskScore: number,
  seasonFactor: number,
  scenario: BacktestScenario,
): number {
  if (realPrice <= 0) return 1;

  const deltaPct = (recommendedPrice - realPrice) / realPrice;
  const scenarioMultiplier = scenarioPriceToleranceMultiplier(scenario);

  if (deltaPct <= 0) {
    const improvement = Math.min(0.2, Math.abs(deltaPct) * 0.6 + 0.02);
    return clamp01(1 + improvement);
  }

  const demandBoost = demandToleranceBoost(demandScore, seasonFactor);
  const riskPenalty = riskScore >= 70 ? 0.08 : riskScore >= 55 ? 0.04 : 0.01;

  let basePenalty: number;
  if (deltaPct <= 0.1 && demandScore > 70) {
    basePenalty = 0.02;
  } else if (deltaPct <= 0.25 && demandScore >= 45) {
    basePenalty = 0.08;
  } else {
    basePenalty = 0.18;
  }

  const adjustedPenalty = (basePenalty + riskPenalty - demandBoost) / scenarioMultiplier;
  return clamp01(1 - Math.max(0.01, adjustedPenalty));
}

function computeFreeNightBaselineProbability(demandScore: number, riskScore: number): number {
  const demandComponent = (demandScore / 100) * 0.55;
  const riskComponent = (riskScore / 100) * 0.35;
  return clamp01(Math.max(0.02, demandComponent - riskComponent));
}

function computeNightExpectedProbability(params: {
  realBooked: boolean;
  impact: number;
  demandScore: number;
  riskScore: number;
}): number {
  if (params.realBooked) {
    return clamp01(params.impact);
  }

  const baseline = computeFreeNightBaselineProbability(params.demandScore, params.riskScore);
  return clamp01(baseline * params.impact);
}

function summarizeDiagnostic(scenarioResult: BacktestScenarioResult): string {
  if (scenarioResult.revenueDeltaMad > 0 && scenarioResult.revenueDeltaPct >= 8) {
    return 'Le moteur surperforme le pricing historique sur cette période avec un gain net significatif.';
  }
  if (scenarioResult.revenueDeltaMad > 0) {
    return 'Le moteur apporte un gain modéré. Calibration fine recommandée avant application continue.';
  }
  if (scenarioResult.revenueDeltaPct <= -5) {
    return 'Le moteur est trop agressif sur certaines plages. Réduire les hausses en demande moyenne/basse.';
  }
  return 'Résultat proche du pricing historique. Le moteur est globalement neutre sur la période.';
}

function computeScenarioResult(input: BacktestInput): BacktestScenarioResult {
  const listingBookings = input.bookings.filter((booking) => booking.listingId === input.listing.id);
  const historicalPricingByDate = new Map<string, DailyPricing>(
    (input.historicalDailyPricing ?? [])
      .filter((item) => item.listingId === input.listing.id)
      .map((item) => [item.date, item]),
  );

  const realNightPriceMap = buildRealNightPriceMap(listingBookings);
  const totalDays = diffInDays(input.periodStart, input.periodEnd) + 1;
  const dates = eachDay(input.periodStart, totalDays);

  const records: BacktestNightRecord[] = [];
  let increaseCount = 0;
  let decreaseCount = 0;
  let holdCount = 0;

  let revenueReal = 0;
  let revenueSimulated = 0;
  let bookedRealNights = 0;
  let bookedSimulatedNights = 0;

  for (const date of dates) {
    const realBooked = listingBookings.some((booking) => isNightBooked(booking, date));
    const historicalDay = historicalPricingByDate.get(date);
    const inferredRealPrice = realNightPriceMap.get(date) ?? historicalDay?.currentPrice ?? input.listing.basePrice;
    const decisionDate = addDays(date, -(input.simulation.decisionLeadDays ?? 14));

    const recommendation = calculateRecommendedPrice({
      date,
      today: decisionDate,
      listing: input.listing,
      bookings: listingBookings,
      competitors: input.competitors,
      events: input.events,
      currentPrice: inferredRealPrice,
    });

    if (recommendation.decision === 'increase') increaseCount += 1;
    else if (recommendation.decision === 'decrease') decreaseCount += 1;
    else holdCount += 1;

    const seasonFactor = getFactorValue(recommendation.factors, 'season');
    const impact = estimateBookingProbabilityImpact(
      inferredRealPrice,
      recommendation.recommendedPrice,
      recommendation.demandScore,
      recommendation.riskScore,
      seasonFactor,
      input.simulation.scenario,
    );

    const expectedBookingProbability = computeNightExpectedProbability({
      realBooked,
      impact,
      demandScore: recommendation.demandScore,
      riskScore: recommendation.riskScore,
    });

    const expectedRevenue = recommendation.recommendedPrice * expectedBookingProbability;
    const realRevenue = realBooked ? inferredRealPrice : 0;

    revenueReal += realRevenue;
    revenueSimulated += expectedRevenue;
    bookedRealNights += realBooked ? 1 : 0;
    bookedSimulatedNights += expectedBookingProbability;

    records.push({
      date,
      realBooked,
      realPrice: inferredRealPrice,
      recommendedPrice: recommendation.recommendedPrice,
      expectedBookingProbability,
      expectedRevenue,
      demandScore: recommendation.demandScore,
      riskScore: recommendation.riskScore,
      opportunityScore: recommendation.opportunityScore,
      decision: recommendation.decision,
      factors: recommendation.factors,
    });
  }

  const availableDays = Math.max(1, computeAvailabilityDays(listingBookings, dates));
  const occupancyReal = bookedRealNights / availableDays;
  const occupancySimulated = bookedSimulatedNights / availableDays;
  const adrReal = bookedRealNights > 0 ? revenueReal / bookedRealNights : 0;
  const adrSimulated = bookedSimulatedNights > 0 ? revenueSimulated / bookedSimulatedNights : 0;
  const revparReal = revenueReal / availableDays;
  const revparSimulated = revenueSimulated / availableDays;

  const revenueDeltaMad = revenueSimulated - revenueReal;
  const revenueDeltaPct = revenueReal > 0 ? (revenueDeltaMad / revenueReal) * 100 : 0;

  const topMissedOpportunities: BacktestOpportunityItem[] = records
    .filter((record) => record.realBooked)
    .map((record) => {
      const realRevenue = record.realPrice;
      const expectedGainMad = record.expectedRevenue - realRevenue;
      return {
        date: record.date,
        realPrice: record.realPrice,
        recommendedPrice: record.recommendedPrice,
        expectedGainMad,
        demandScore: record.demandScore,
        reason: describeOpportunity(record),
      };
    })
    .filter((item) => item.expectedGainMad > 0)
    .sort((left, right) => right.expectedGainMad - left.expectedGainMad)
    .slice(0, 10);

  const topRiskyDates: BacktestRiskItem[] = records
    .map((record) => {
      const realRevenue = record.realBooked ? record.realPrice : 0;
      const expectedLossMad = realRevenue - record.expectedRevenue;
      return {
        date: record.date,
        realPrice: record.realPrice,
        recommendedPrice: record.recommendedPrice,
        expectedLossMad,
        riskScore: record.riskScore,
        reason: describeRisk(record),
      };
    })
    .filter((item) => item.expectedLossMad > 0)
    .sort((left, right) => right.expectedLossMad - left.expectedLossMad)
    .slice(0, 10);

  const result: BacktestScenarioResult = {
    scenario: input.simulation.scenario,
    revenueReal: Math.round(revenueReal),
    revenueSimulated: Math.round(revenueSimulated),
    revenueDeltaMad: Math.round(revenueDeltaMad),
    revenueDeltaPct: Number(revenueDeltaPct.toFixed(2)),
    occupancyReal: Number((occupancyReal * 100).toFixed(2)),
    occupancySimulated: Number((occupancySimulated * 100).toFixed(2)),
    adrReal: Number(adrReal.toFixed(2)),
    adrSimulated: Number(adrSimulated.toFixed(2)),
    revparReal: Number(revparReal.toFixed(2)),
    revparSimulated: Number(revparSimulated.toFixed(2)),
    increaseCount,
    decreaseCount,
    holdCount,
    topMissedOpportunities,
    topRiskyDates,
    diagnostic: '',
    nightRecords: records,
  };

  return {
    ...result,
    diagnostic: summarizeDiagnostic(result),
  };
}

export function runBacktest(input: BacktestRunInput): BacktestRunResult {
  const scenarios: BacktestScenario[] = ['prudent', 'balanced', 'aggressive'];

  const scenarioResults = scenarios.map((scenario) =>
    computeScenarioResult({
      listing: input.listing,
      bookings: input.bookings,
      historicalDailyPricing: input.historicalDailyPricing,
      competitors: input.competitors,
      events: input.events,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      simulation: {
        scenario,
        decisionLeadDays: input.simulationParams?.decisionLeadDays ?? 14,
      },
    }),
  );

  return {
    listingId: input.listing.id,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    generatedAt: new Date().toISOString(),
    scenarios: scenarioResults,
  };
}
