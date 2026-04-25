import { calculateRecommendedPrice, decidePricingAction } from '../engine';
import type {
  Booking,
  Competitor,
  DailyPricing,
  Listing,
  LocalEvent,
  PricingRecommendation,
  PricingSettings,
} from '../types';
import { eachDay } from '../utils/dates';

function isCooldownActive(settings: PricingSettings | undefined, today: string): boolean {
  if (!settings?.lastManualUpdateAt) return false;
  const nowTimestamp = new Date(`${today}T00:00:00Z`).getTime();
  const lastManualUpdateTimestamp = new Date(settings.lastManualUpdateAt).getTime();
  if (Number.isNaN(lastManualUpdateTimestamp)) return false;
  const elapsedMs = nowTimestamp - lastManualUpdateTimestamp;
  const cooldownMs = settings.cooldownHours * 60 * 60 * 1000;
  return elapsedMs >= 0 && elapsedMs < cooldownMs;
}

function applyDailyVariationLimit(
  recommendedPrice: number,
  referencePrice: number,
  maxDailyVariationPct: number,
): number {
  const safePct = Math.max(0, Math.min(1, maxDailyVariationPct));
  const minAllowed = Math.round(referencePrice * (1 - safePct));
  const maxAllowed = Math.round(referencePrice * (1 + safePct));
  return Math.max(minAllowed, Math.min(maxAllowed, recommendedPrice));
}

export function generateDailyPricingForListing(params: {
  listing: Listing;
  bookings: Booking[];
  competitors: Competitor[];
  events: LocalEvent[];
  startDate: string;
  days: number;
  settings?: PricingSettings;
}): DailyPricing[] {
  const dates = eachDay(params.startDate, params.days);
  const createdAt = new Date().toISOString();
  const cooldownActive = isCooldownActive(params.settings, params.startDate);
  const maxDailyVariationPct = params.settings?.maxDailyVariationPct ?? 0.25;
  let previousDayAppliedPrice = params.listing.currentPrice ?? params.listing.basePrice;
  const listingBookings = params.bookings.filter((booking) => booking.listingId === params.listing.id);

  return dates.map((date) => {
    const result = calculateRecommendedPrice({
      date,
      today: params.startDate,
      listing: params.listing,
      bookings: listingBookings,
      bookingsAlreadyFiltered: true,
      competitors: params.competitors,
      events: params.events,
      currentPrice: params.listing.currentPrice ?? params.listing.basePrice,
    });

    let recommendedPrice = result.recommendedPrice;
    let decision = result.decision;
    let explanation = result.explanation;
    let potentialGainMad = result.potentialGainMad;

    if (result.status === 'free') {
      if (cooldownActive) {
        recommendedPrice = result.currentPrice;
        decision = 'hold';
        potentialGainMad = 0;
        explanation = `Cooldown manuel actif: aucune modification automatique. ${result.explanation}`;
      } else {
        const variationLimitedPrice = applyDailyVariationLimit(
          recommendedPrice,
          previousDayAppliedPrice,
          maxDailyVariationPct,
        );

        if (variationLimitedPrice !== recommendedPrice) {
          explanation = `Limite variation journalière appliquée (±${Math.round(maxDailyVariationPct * 100)}%). ${result.explanation}`;
        }

        recommendedPrice = variationLimitedPrice;
        decision = decidePricingAction(result.currentPrice, recommendedPrice, result.demandScore);
        potentialGainMad = Math.max(0, Math.round(recommendedPrice - result.currentPrice));
      }
    }

    previousDayAppliedPrice = recommendedPrice;

    return {
      id: `${params.listing.id}:${date}`,
      listingId: params.listing.id,
      date,
      status: result.status,
      basePrice: result.basePrice,
      currentPrice: result.currentPrice,
      recommendedPrice,
      rawRecommendedPrice: result.rawRecommendedPrice,
      decision,
      demandScore: result.demandScore,
      riskScore: result.riskScore,
      opportunityScore: result.opportunityScore,
      potentialGainMad,
      factors: result.factors,
      explanation,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

export function buildPricingRecommendations(
  dailyPricing: DailyPricing[],
  limit: number = 60,
): PricingRecommendation[] {
  const recommendations = dailyPricing
    .filter((day) => day.status === 'free')
    .map((day) => ({
      id: `reco:${day.id}`,
      listingId: day.listingId,
      date: day.date,
      action: day.decision,
      currentPrice: day.currentPrice,
      recommendedPrice: day.recommendedPrice,
      potentialGainMad: day.potentialGainMad,
      demandScore: day.demandScore,
      riskScore: day.riskScore,
      opportunityScore: day.opportunityScore,
      explanation: day.explanation,
      factors: day.factors,
    }));

  return recommendations
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, limit);
}
