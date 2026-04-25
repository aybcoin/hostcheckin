import {
  calculateCompetitionFactor,
  calculateEventFactor,
  calculateLeadTimeFactor,
  calculateOccupancyFactor,
  calculateOrphanFactor,
  calculateRecommendedPrice,
  calculateSeasonFactor,
  calculateWeekendFactor,
  clampPrice,
} from '../../../src/rentiq/engine';
import type { Booking, Competitor, Listing, LocalEvent } from '../../../src/rentiq/types';
import { generateDailyPricingForListing } from '../../../src/rentiq/services/pricingService';

const listing: Listing = {
  id: 'listing-temara',
  name: 'Témara Premium',
  zone: 'temara',
  capacity: 5,
  bedrooms: 2,
  positioning: 'premium',
  basePrice: 750,
  minPrice: 450,
  maxPrice: 1800,
  cleaningFee: 150,
  amenities: ['parking privé'],
  currentPrice: 750,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function createBooking(id: string, checkIn: string, checkOut: string): Booking {
  return {
    id,
    listingId: listing.id,
    source: 'airbnb',
    checkIn,
    checkOut,
    nights: 1,
    totalRevenue: 0,
    pricePerNight: 0,
    guestCount: 2,
    status: 'confirmed',
    importedFrom: 'manual',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('pricing engine - core factors', () => {
  it('clampPrice respects min and max', () => {
    expect(clampPrice(320, 450, 1800)).toBe(450);
    expect(clampPrice(2100, 450, 1800)).toBe(1800);
    expect(clampPrice(899.4, 450, 1800)).toBe(899);
  });

  it('calculateWeekendFactor applies weekend multipliers', () => {
    expect(calculateWeekendFactor('2026-05-15')).toBe(1.1); // Friday
    expect(calculateWeekendFactor('2026-05-16')).toBe(1.25); // Saturday
    expect(calculateWeekendFactor('2026-05-17')).toBe(1.05); // Sunday
    expect(calculateWeekendFactor('2026-05-13')).toBe(1); // Wednesday
  });

  it('calculateSeasonFactor returns temara peak and low multipliers', () => {
    expect(calculateSeasonFactor('2026-08-15', 'temara')).toBe(1.65);
    expect(calculateSeasonFactor('2026-11-11', 'temara')).toBe(0.8);
  });

  it('calculateOccupancyFactor increases when occupancy is high', () => {
    const highOccupancyBookings: Booking[] = [
      createBooking('b1', '2026-07-25', '2026-08-05'),
      createBooking('b2', '2026-08-06', '2026-08-18'),
      createBooking('b3', '2026-08-19', '2026-08-31'),
    ];

    const factor = calculateOccupancyFactor({
      date: '2026-08-15',
      listingId: listing.id,
      bookings: highOccupancyBookings,
    });

    expect(factor).toBe(1.3);
  });

  it('calculateOccupancyFactor decreases when occupancy is low', () => {
    const factor = calculateOccupancyFactor({
      date: '2026-08-15',
      listingId: listing.id,
      bookings: [],
    });

    expect(factor).toBe(0.9);
  });

  it('calculateLeadTimeFactor handles last-minute dates', () => {
    expect(calculateLeadTimeFactor('2026-05-10', '2026-05-09')).toBe(0.95); // J-1
    expect(calculateLeadTimeFactor('2026-05-10', '2026-05-10')).toBe(0.85); // J0
  });

  it('calculateOrphanFactor detects orphan night between two booked nights', () => {
    const bookings: Booking[] = [
      createBooking('o1', '2026-07-10', '2026-07-11'),
      createBooking('o2', '2026-07-12', '2026-07-13'),
    ];

    expect(calculateOrphanFactor({ date: '2026-07-11', bookings })).toBe(0.85);
  });

  it('calculateEventFactor increases on local event dates', () => {
    const events: LocalEvent[] = [
      {
        id: 'event-mawazine-test',
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

    expect(calculateEventFactor({ date: '2026-06-20', zone: 'temara', events })).toBe(1.2);
    expect(calculateEventFactor({ date: '2026-06-30', zone: 'temara', events })).toBe(1);
  });

  it('calculateCompetitionFactor reacts when competitors are cheaper', () => {
    const competitors: Competitor[] = [
      {
        id: 'cp-cheap',
        name: 'Cheaper competitor',
        zone: 'temara',
        capacity: 5,
        positioning: 'premium',
        priceWeekday: 500,
        priceWeekend: 650,
        cleaningFee: 120,
        rating: 4.5,
        amenities: [],
        observations: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(
      calculateCompetitionFactor({
        date: '2026-05-13',
        listing,
        currentPrice: 750,
        competitors,
      }),
    ).toBe(0.9);
  });

  it('calculateCompetitionFactor reacts when competitors are more expensive', () => {
    const competitors: Competitor[] = [
      {
        id: 'cp-expensive',
        name: 'Expensive competitor',
        zone: 'temara',
        capacity: 5,
        positioning: 'premium',
        priceWeekday: 1000,
        priceWeekend: 1300,
        cleaningFee: 120,
        rating: 4.5,
        amenities: [],
        observations: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    expect(
      calculateCompetitionFactor({
        date: '2026-05-13',
        listing,
        currentPrice: 750,
        competitors,
      }),
    ).toBe(1.1);
  });
});

describe('pricing engine - recommendation scenarios', () => {
  it('calculateRecommendedPrice returns a deterministic recommendation payload', () => {
    const competitors: Competitor[] = [
      {
        id: 'c1',
        name: 'Competitor 1',
        zone: 'temara',
        capacity: 4,
        positioning: 'premium',
        priceWeekday: 700,
        priceWeekend: 980,
        cleaningFee: 120,
        rating: 4.7,
        amenities: [],
        observations: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const events: LocalEvent[] = [
      {
        id: 'e1',
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

    const result = calculateRecommendedPrice({
      date: '2026-06-20',
      today: '2026-05-30',
      listing,
      bookings: [],
      competitors,
      events,
      currentPrice: 750,
    });

    expect(result.recommendedPrice).toBeGreaterThan(750);
    expect(result.rawRecommendedPrice).toBeGreaterThan(750);
    expect(result.factors).toHaveLength(9);
    expect(result.explanation).toContain('recommandation');
  });

  it('Temara high season (August) should clamp to max price', () => {
    const highSeasonBookings: Booking[] = [
      createBooking('h1', '2026-07-25', '2026-08-14'),
      createBooking('h2', '2026-08-16', '2026-08-26'),
      createBooking('h3', '2026-08-27', '2026-09-05'),
    ];

    const competitors: Competitor[] = [
      {
        id: 'c2',
        name: 'Competitor 2',
        zone: 'temara',
        capacity: 5,
        positioning: 'premium',
        priceWeekday: 740,
        priceWeekend: 1050,
        cleaningFee: 150,
        rating: 4.8,
        amenities: [],
        observations: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const events: LocalEvent[] = [
      {
        id: 'e2',
        name: 'Vacances été',
        category: 'school_holiday',
        startDate: '2026-07-01',
        endDate: '2026-08-31',
        zonesImpacted: ['temara'],
        expectedImpact: 'high',
        multiplierHint: 1.18,
        source: 'MEN',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const result = calculateRecommendedPrice({
      date: '2026-08-15',
      today: '2026-07-25',
      listing,
      bookings: highSeasonBookings,
      competitors,
      events,
      currentPrice: 750,
    });

    expect(result.rawRecommendedPrice).toBeGreaterThan(1800);
    expect(result.rawRecommendedPrice).toBeGreaterThan(listing.maxPrice); // prix au-dessus maxPrice
    expect(result.recommendedPrice).toBe(1800);
    expect(result.decision).toBe('increase');
  });

  it('Temara low season (November) should clamp to min price', () => {
    const lowSeasonBookings: Booking[] = [
      createBooking('l1', '2026-11-10', '2026-11-11'),
      createBooking('l2', '2026-11-12', '2026-11-13'),
    ];

    const lowCompetitors: Competitor[] = [
      {
        id: 'c3',
        name: 'Competitor low season',
        zone: 'temara',
        capacity: 5,
        positioning: 'standard',
        priceWeekday: 520,
        priceWeekend: 640,
        cleaningFee: 90,
        rating: 4.3,
        amenities: [],
        observations: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const result = calculateRecommendedPrice({
      date: '2026-11-11',
      today: '2026-11-09',
      listing,
      bookings: lowSeasonBookings,
      competitors: lowCompetitors,
      events: [],
      currentPrice: 750,
    });

    expect(result.rawRecommendedPrice).toBeLessThan(450);
    expect(result.rawRecommendedPrice).toBeLessThan(listing.minPrice); // prix sous minPrice
    expect(result.recommendedPrice).toBe(450);
    expect(result.decision).toBe('decrease');
  });

  it('week-end signal should generally produce higher recommendation than weekday in same context', () => {
    const weekdayResult = calculateRecommendedPrice({
      date: '2026-05-13', // Wednesday
      today: '2026-05-01',
      listing,
      bookings: [],
      competitors: [],
      events: [],
      currentPrice: 750,
    });

    const weekendResult = calculateRecommendedPrice({
      date: '2026-05-16', // Saturday
      today: '2026-05-01',
      listing,
      bookings: [],
      competitors: [],
      events: [],
      currentPrice: 750,
    });

    expect(weekendResult.rawRecommendedPrice).toBeGreaterThan(weekdayResult.rawRecommendedPrice);
  });
});

describe('pricing service guardrails', () => {
  const noCompetition: Competitor[] = [];
  const noEvents: LocalEvent[] = [];
  const noBookings: Booking[] = [];

  it('applies max daily variation guardrail (±25%)', () => {
    const daily = generateDailyPricingForListing({
      listing: {
        ...listing,
        currentPrice: 750,
      },
      bookings: noBookings,
      competitors: noCompetition,
      events: noEvents,
      startDate: '2026-08-15',
      days: 1,
      settings: {
        id: 'settings-1',
        listingId: listing.id,
        shadowMode: true,
        maxDailyVariationPct: 0.25,
        cooldownHours: 48,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    expect(daily[0]?.recommendedPrice).toBeLessThanOrEqual(Math.round(750 * 1.25));
    expect(daily[0]?.recommendedPrice).toBeGreaterThanOrEqual(Math.round(750 * 0.75));
  });

  it('enforces cooldown after manual update', () => {
    const daily = generateDailyPricingForListing({
      listing: {
        ...listing,
        currentPrice: 750,
      },
      bookings: noBookings,
      competitors: noCompetition,
      events: noEvents,
      startDate: '2026-08-15',
      days: 2,
      settings: {
        id: 'settings-2',
        listingId: listing.id,
        shadowMode: true,
        maxDailyVariationPct: 0.25,
        cooldownHours: 48,
        lastManualUpdateAt: '2026-08-14T12:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    expect(daily[0]?.recommendedPrice).toBe(750);
    expect(daily[0]?.decision).toBe('hold');
    expect(daily[0]?.explanation).toContain('Cooldown manuel actif');
  });
});
