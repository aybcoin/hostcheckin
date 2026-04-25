import type { Competitor, Listing } from '../../types';
import { isWeekend } from '../../utils/dates';

interface CompetitionInput {
  date: string;
  listing: Listing;
  currentPrice: number;
  competitors: Competitor[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function calculateCompetitionFactor(input: CompetitionInput): number {
  const relevant = input.competitors.filter((competitor) => {
    const sameZone = competitor.zone === input.listing.zone;
    const similarCapacity = Math.abs(competitor.capacity - input.listing.capacity) <= 2;
    return sameZone && similarCapacity;
  });

  if (relevant.length === 0) return 1;

  const weekend = isWeekend(input.date);
  const competitorPrices = relevant.map((competitor) =>
    weekend ? competitor.priceWeekend : competitor.priceWeekday,
  );

  const medianPrice = median(competitorPrices);
  if (medianPrice <= 0) return 1;

  const ratio = input.currentPrice / medianPrice;

  if (ratio > 1.2) return 0.9;
  if (ratio >= 0.95) return 1;
  return 1.1;
}

export function calculateCompetitorMedianPrice(input: CompetitionInput): number {
  const relevant = input.competitors.filter((competitor) => competitor.zone === input.listing.zone);
  if (relevant.length === 0) return 0;
  const weekend = isWeekend(input.date);
  const prices = relevant.map((competitor) => (weekend ? competitor.priceWeekend : competitor.priceWeekday));
  return median(prices);
}
