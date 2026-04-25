import { describe, expect, it } from 'vitest';
import { generateDailyPricingForListing } from '../../../src/rentiq/services/pricingService';
import type { Booking, Competitor, Listing, LocalEvent, PricingSettings } from '../../../src/rentiq/types';

const listing: Listing = {
  id: 'listing-perf',
  name: 'Perf listing',
  zone: 'temara',
  capacity: 5,
  bedrooms: 2,
  positioning: 'premium',
  basePrice: 750,
  minPrice: 450,
  maxPrice: 1800,
  cleaningFee: 150,
  amenities: [],
  currentPrice: 750,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const competitors: Competitor[] = Array.from({ length: 25 }).map((_, index) => ({
  id: `c-${index}`,
  name: `Competitor ${index}`,
  zone: 'temara',
  capacity: 3 + (index % 4),
  positioning: 'standard',
  priceWeekday: 550 + index * 5,
  priceWeekend: 700 + index * 6,
  cleaningFee: 100,
  rating: 4.2,
  amenities: [],
  observations: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}));

const events: LocalEvent[] = [
  {
    id: 'e-mawazine',
    name: 'Mawazine',
    category: 'festival',
    startDate: '2026-06-19',
    endDate: '2026-06-27',
    zonesImpacted: ['temara'],
    expectedImpact: 'high',
    multiplierHint: 1.2,
    source: 'Visit Rabat',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const settings: PricingSettings = {
  id: 's-perf',
  listingId: listing.id,
  shadowMode: true,
  maxDailyVariationPct: 0.25,
  cooldownHours: 48,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeBookings(count: number): Booking[] {
  return Array.from({ length: count }).map((_, index) => {
    const day = `${(index % 27) + 1}`.padStart(2, '0');
    return {
      id: `b-${index}`,
      listingId: listing.id,
      source: 'airbnb',
      checkIn: `2026-08-${day}`,
      checkOut: `2026-08-${`${(index % 27) + 2}`.padStart(2, '0')}`,
      nights: 1,
      totalRevenue: 0,
      pricePerNight: 0,
      guestCount: 2,
      status: 'confirmed',
      importedFrom: 'manual',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  });
}

describe('pricing performance', () => {
  it('computes 60 days quickly for single listing', () => {
    const start = performance.now();
    const result = generateDailyPricingForListing({
      listing,
      bookings: makeBookings(80),
      competitors,
      events,
      startDate: '2026-06-01',
      days: 60,
      settings,
    });
    const duration = performance.now() - start;

    expect(result).toHaveLength(60);
    expect(duration).toBeLessThan(600);
  });

  it('computes 365 days under acceptable threshold', () => {
    const start = performance.now();
    const result = generateDailyPricingForListing({
      listing,
      bookings: makeBookings(220),
      competitors,
      events,
      startDate: '2026-01-01',
      days: 365,
      settings,
    });
    const duration = performance.now() - start;

    expect(result).toHaveLength(365);
    expect(duration).toBeLessThan(2500);
  });
});
