import { describe, expect, it } from 'vitest';
import { buildCalibrationReport } from '../../../src/rentiq/engine/calibration';
import { estimateBookingProbabilityImpact, runBacktest } from '../../../src/rentiq/engine/backtest';
import { calculateLocalDemandFactor } from '../../../src/rentiq/engine/factors/localDemand';
import { rankRecommendationsForMode } from '../../../src/rentiq/services/recommendationService';
import type {
  BacktestScenarioResult,
  Booking,
  Competitor,
  Listing,
  LocalEvent,
  PricingFactor,
  PricingRecommendation,
} from '../../../src/rentiq/types';

const listing: Listing = {
  id: 'listing-backtest-temara',
  name: 'Témara Backtest',
  zone: 'temara',
  capacity: 5,
  bedrooms: 2,
  positioning: 'premium',
  basePrice: 750,
  minPrice: 450,
  maxPrice: 1800,
  cleaningFee: 150,
  amenities: ['parking', 'fibre'],
  currentPrice: 750,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function booking(params: {
  id: string;
  checkIn: string;
  checkOut: string;
  pricePerNight: number;
  status?: Booking['status'];
}): Booking {
  return {
    id: params.id,
    listingId: listing.id,
    source: 'airbnb',
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    nights: 2,
    totalRevenue: params.pricePerNight * 2,
    pricePerNight: params.pricePerNight,
    guestCount: 2,
    status: params.status ?? 'confirmed',
    importedFrom: 'unit-test',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

const competitors: Competitor[] = [
  {
    id: 'comp-1',
    name: 'Rabat Ocean',
    zone: 'temara',
    capacity: 5,
    positioning: 'premium',
    priceWeekday: 880,
    priceWeekend: 1080,
    cleaningFee: 120,
    rating: 4.75,
    amenities: ['parking'],
    observations: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const events: LocalEvent[] = [
  {
    id: 'ev-summer',
    name: "Vacances d'été",
    category: 'school_holiday',
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    zonesImpacted: ['temara', 'rabat', 'sale'],
    expectedImpact: 'high',
    multiplierHint: 1.18,
    source: 'MEN',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('backtest engine scenarios', () => {
  function runFixtureBacktest() {
    const bookings: Booking[] = [
      booking({ id: 'b1', checkIn: '2026-08-05', checkOut: '2026-08-08', pricePerNight: 980 }),
      booking({ id: 'b2', checkIn: '2026-08-12', checkOut: '2026-08-15', pricePerNight: 1050 }),
      booking({ id: 'b3', checkIn: '2026-08-20', checkOut: '2026-08-22', pricePerNight: 920 }),
      booking({ id: 'blocked-1', checkIn: '2026-08-24', checkOut: '2026-08-25', pricePerNight: 0, status: 'blocked' }),
    ];

    const result = runBacktest({
      listing,
      bookings,
      historicalDailyPricing: [],
      competitors,
      events,
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
    });

    return result;
  }

  it('provides prudent, balanced and aggressive scenarios', () => {
    const result = runFixtureBacktest();

    expect(result.scenarios).toHaveLength(3);
    const prudent = result.scenarios.find((scenario) => scenario.scenario === 'prudent');
    const balanced = result.scenarios.find((scenario) => scenario.scenario === 'balanced');
    const aggressive = result.scenarios.find((scenario) => scenario.scenario === 'aggressive');

    expect(prudent).toBeDefined();
    expect(balanced).toBeDefined();
    expect(aggressive).toBeDefined();

    expect((aggressive?.revenueSimulated ?? 0)).toBeGreaterThanOrEqual(prudent?.revenueSimulated ?? 0);
    expect((balanced?.increaseCount ?? 0) + (balanced?.decreaseCount ?? 0) + (balanced?.holdCount ?? 0)).toBe(31);
  });

  it('computes prudent scenario metrics', () => {
    const prudent = runFixtureBacktest().scenarios.find((scenario) => scenario.scenario === 'prudent');
    expect(prudent?.revenueReal ?? 0).toBeGreaterThan(0);
    expect(prudent?.occupancySimulated ?? 0).toBeGreaterThan(0);
  });

  it('computes balanced scenario metrics', () => {
    const balanced = runFixtureBacktest().scenarios.find((scenario) => scenario.scenario === 'balanced');
    expect(balanced?.adrSimulated ?? 0).toBeGreaterThan(0);
    expect(balanced?.revparSimulated ?? 0).toBeGreaterThan(0);
  });

  it('computes aggressive scenario metrics', () => {
    const aggressive = runFixtureBacktest().scenarios.find((scenario) => scenario.scenario === 'aggressive');
    expect(aggressive?.revenueSimulated ?? 0).toBeGreaterThan(0);
    expect(aggressive?.topMissedOpportunities.length ?? 0).toBeLessThanOrEqual(10);
  });
});

describe('elasticity model', () => {
  it('keeps probability stable when price decreases', () => {
    const impact = estimateBookingProbabilityImpact(900, 820, 45, 55, 1, 'balanced');
    expect(impact).toBe(1);
  });

  it('is more tolerant in strong demand than in weak demand for price increases', () => {
    const weakDemand = estimateBookingProbabilityImpact(900, 1125, 35, 70, 0.85, 'balanced');
    const strongDemand = estimateBookingProbabilityImpact(900, 980, 82, 35, 1.3, 'balanced');
    expect(strongDemand).toBeGreaterThan(weakDemand);
  });
});

describe('calibration report', () => {
  function factors(values: Partial<Record<PricingFactor['key'], number>> = {}): PricingFactor[] {
    const defaults: Record<PricingFactor['key'], number> = {
      season: 1.2,
      weekend: 1.15,
      leadTime: 0.95,
      occupancy: 1.05,
      competition: 1,
      event: 1.18,
      orphan: 1,
      standing: 1.1,
      localDemand: 1.04,
    };

    return (Object.keys(defaults) as PricingFactor['key'][]).map((key) => ({
      key,
      label: key,
      value: values[key] ?? defaults[key],
      reason: 'test',
      impactMad: 0,
    }));
  }

  it('suggests reducing aggressive event/weekend/local-demand drift when risk is high', () => {
    const mockResult: BacktestScenarioResult = {
      scenario: 'balanced',
      revenueReal: 50000,
      revenueSimulated: 47000,
      revenueDeltaMad: -3000,
      revenueDeltaPct: -6,
      occupancyReal: 70,
      occupancySimulated: 62,
      adrReal: 900,
      adrSimulated: 980,
      revparReal: 630,
      revparSimulated: 607,
      increaseCount: 20,
      decreaseCount: 5,
      holdCount: 5,
      topMissedOpportunities: [],
      topRiskyDates: [
        { date: '2026-08-03', realPrice: 900, recommendedPrice: 1100, expectedLossMad: 120, riskScore: 75, reason: 'test' },
        { date: '2026-08-06', realPrice: 920, recommendedPrice: 1120, expectedLossMad: 140, riskScore: 80, reason: 'test' },
        { date: '2026-08-08', realPrice: 950, recommendedPrice: 1130, expectedLossMad: 160, riskScore: 82, reason: 'test' },
      ],
      diagnostic: 'test',
      nightRecords: Array.from({ length: 20 }, (_, index) => ({
        date: `2026-08-${`${index + 1}`.padStart(2, '0')}`,
        realBooked: index % 2 === 0,
        realPrice: 900,
        recommendedPrice: 1020,
        expectedBookingProbability: 0.75,
        expectedRevenue: 765,
        demandScore: 60,
        riskScore: 65,
        opportunityScore: 52,
        decision: 'increase',
        factors: factors(),
      })),
    };

    const report = buildCalibrationReport(mockResult);
    const suggestedFactors = report.suggestions.map((item) => item.factor);

    expect(suggestedFactors).toContain('event');
    expect(suggestedFactors).toContain('weekend');
    expect(suggestedFactors).toContain('localDemand');
  });
});

describe('localDemand prudent mode', () => {
  it('stays neutral by default to avoid double-counting', () => {
    expect(calculateLocalDemandFactor({ seasonFactor: 1.6, eventFactor: 1.25, occupancyFactor: 1.2 })).toBe(1);
  });

  it('allows bounded manual signal when explicitly provided', () => {
    expect(calculateLocalDemandFactor({ manualMultiplier: 1.2 })).toBe(1.08);
    expect(calculateLocalDemandFactor({ manualMultiplier: 0.8 })).toBe(0.95);
  });
});

describe('defensive recommendation sorting', () => {
  function recommendation(params: {
    id: string;
    date: string;
    action: PricingRecommendation['action'];
    potentialGainMad: number;
    demandScore: number;
    riskScore: number;
    opportunityScore: number;
    leadTimeFactor?: number;
    competitionFactor?: number;
    orphanFactor?: number;
  }): PricingRecommendation {
    return {
      id: params.id,
      listingId: listing.id,
      date: params.date,
      action: params.action,
      currentPrice: 750,
      recommendedPrice: 900,
      potentialGainMad: params.potentialGainMad,
      demandScore: params.demandScore,
      riskScore: params.riskScore,
      opportunityScore: params.opportunityScore,
      explanation: 'test',
      factors: [
        { key: 'season', label: 'season', value: 1.1, reason: 'test', impactMad: 0 },
        { key: 'weekend', label: 'weekend', value: 1, reason: 'test', impactMad: 0 },
        { key: 'leadTime', label: 'leadTime', value: params.leadTimeFactor ?? 1, reason: 'test', impactMad: 0 },
        { key: 'occupancy', label: 'occupancy', value: 1, reason: 'test', impactMad: 0 },
        { key: 'competition', label: 'competition', value: params.competitionFactor ?? 1, reason: 'test', impactMad: 0 },
        { key: 'event', label: 'event', value: 1, reason: 'test', impactMad: 0 },
        { key: 'orphan', label: 'orphan', value: params.orphanFactor ?? 1, reason: 'test', impactMad: 0 },
        { key: 'standing', label: 'standing', value: 1.1, reason: 'test', impactMad: 0 },
        { key: 'localDemand', label: 'localDemand', value: 1, reason: 'test', impactMad: 0 },
      ],
    };
  }

  it('opportunities mode ranks with mixed score, not pure gain only', () => {
    const results = rankRecommendationsForMode(
      [
        recommendation({
          id: 'op-low-risk',
          date: '2026-08-10',
          action: 'increase',
          potentialGainMad: 260,
          demandScore: 75,
          riskScore: 20,
          opportunityScore: 45,
        }),
        recommendation({
          id: 'op-high-signal',
          date: '2026-08-11',
          action: 'increase',
          potentialGainMad: 220,
          demandScore: 78,
          riskScore: 78,
          opportunityScore: 95,
        }),
      ],
      '2026-08-01',
      'opportunities',
    );

    expect(results[0]?.recommendation.id).toBe('op-high-signal');
  });

  it('rescue mode prioritizes urgent risky nights with orphan/last-minute/competition signals', () => {
    const results = rankRecommendationsForMode(
      [
        recommendation({
          id: 'rescue-urgent',
          date: '2026-08-02',
          action: 'decrease',
          potentialGainMad: 20,
          demandScore: 35,
          riskScore: 82,
          opportunityScore: 30,
          leadTimeFactor: 0.9,
          competitionFactor: 0.9,
          orphanFactor: 0.85,
        }),
        recommendation({
          id: 'rescue-later',
          date: '2026-08-20',
          action: 'decrease',
          potentialGainMad: 50,
          demandScore: 45,
          riskScore: 60,
          opportunityScore: 38,
          leadTimeFactor: 1,
          competitionFactor: 1,
          orphanFactor: 1,
        }),
      ],
      '2026-08-01',
      'rescue',
    );

    expect(results[0]?.recommendation.id).toBe('rescue-urgent');
  });
});
