import { describe, expect, it } from 'vitest';
import {
  computeAnalyticsSummary,
  computeAvgLeadTime,
  computeAvgLengthOfStay,
  computeKpiDelta,
  computeLeadTimeDist,
  computeOccupancyTrend,
  computeRevenueTrend,
  computeRevPAN,
  computeSourceBreakdown,
  exportAnalyticsCsv,
} from '../../src/lib/analytics-logic';
import type { Property, Reservation } from '../../src/lib/supabase';
import type { FinanceTransaction, Period } from '../../src/types/finance';

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'res-1',
    property_id: 'prop-1',
    guest_id: 'guest-1',
    check_in_date: '2026-04-10',
    check_out_date: '2026-04-12',
    number_of_guests: 2,
    booking_reference: 'RES-001',
    unique_link: 'unique-link',
    status: 'pending',
    total_amount: 120,
    verification_type: 'simple',
    verification_mode: 'simple',
    smart_lock_code: null,
    guest_rating: 5,
    cancelled_at: undefined,
    notes: null,
    external_source: null,
    external_uid: null,
    external_feed_id: null,
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-01T10:00:00Z',
    ...overrides,
  };
}

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'prop-1',
    host_id: 'host-1',
    name: 'Riad Atlas',
    address: '1 rue Atlas',
    city: 'Marrakech',
    postal_code: '40000',
    country: 'Maroc',
    description: undefined,
    rooms_count: 2,
    bathrooms_count: 1,
    max_guests: 4,
    amenities: [],
    check_in_time: '15:00',
    check_out_time: '11:00',
    verification_mode: 'simple',
    auto_link_active: false,
    auto_link_regenerated_at: null,
    base_nightly_rate: 90,
    pricing_currency: 'EUR',
    image_url: undefined,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

function makeTx(overrides: Partial<FinanceTransaction> = {}): FinanceTransaction {
  return {
    id: 'tx-1',
    host_id: 'host-1',
    property_id: 'prop-1',
    kind: 'income',
    category: 'other_income',
    amount: 50,
    currency: 'EUR',
    occurred_on: '2026-04-10',
    description: null,
    notes: null,
    created_at: '2026-04-10T10:00:00Z',
    updated_at: '2026-04-10T10:00:00Z',
    ...overrides,
  };
}

describe('computeRevenueTrend', () => {
  const aprilPeriod: Period = { start: '2026-04-01', end: '2026-04-30' };

  it('computes single-month reservation revenue', () => {
    const trend = computeRevenueTrend({
      reservations: [makeReservation({ total_amount: 240 })],
      transactions: [],
      period: aprilPeriod,
    });

    expect(trend).toHaveLength(1);
    expect(trend[0]).toMatchObject({ revenue: 240, expenses: 0, net: 240 });
  });

  it('adds income transactions to revenue', () => {
    const trend = computeRevenueTrend({
      reservations: [makeReservation({ total_amount: 100 })],
      transactions: [makeTx({ amount: 75, kind: 'income' })],
      period: aprilPeriod,
    });

    expect(trend[0]?.revenue).toBe(175);
    expect(trend[0]?.net).toBe(175);
  });

  it('excludes cancelled reservations', () => {
    const trend = computeRevenueTrend({
      reservations: [makeReservation({ status: 'cancelled', total_amount: 999 })],
      transactions: [],
      period: aprilPeriod,
    });

    expect(trend[0]?.revenue).toBe(0);
  });

  it('applies the property filter', () => {
    const trend = computeRevenueTrend({
      reservations: [
        makeReservation({ property_id: 'prop-1', total_amount: 100 }),
        makeReservation({ id: 'res-2', property_id: 'prop-2', total_amount: 300 }),
      ],
      transactions: [
        makeTx({ property_id: 'prop-1', amount: 40, kind: 'expense' }),
        makeTx({ id: 'tx-2', property_id: 'prop-2', amount: 60, kind: 'income' }),
      ],
      period: aprilPeriod,
      propertyFilter: 'prop-2',
    });

    expect(trend[0]).toMatchObject({ revenue: 360, expenses: 0, net: 360 });
  });

  it('sets previous-year values to null when no prior data exists', () => {
    const trend = computeRevenueTrend({
      reservations: [makeReservation({ total_amount: 120 })],
      transactions: [],
      period: aprilPeriod,
    });

    expect(trend[0]?.prevYearRevenue).toBeNull();
    expect(trend[0]?.prevYearNet).toBeNull();
  });

  it('populates previous-year revenue and net from matching prior-month data', () => {
    const trend = computeRevenueTrend({
      reservations: [
        makeReservation({ id: 'current', total_amount: 200 }),
        makeReservation({
          id: 'prev',
          check_in_date: '2025-04-08',
          check_out_date: '2025-04-12',
          total_amount: 180,
        }),
      ],
      transactions: [
        makeTx({ kind: 'expense', amount: 20, occurred_on: '2026-04-18' }),
        makeTx({ id: 'tx-prev', kind: 'expense', amount: 30, occurred_on: '2025-04-18' }),
      ],
      period: aprilPeriod,
    });

    expect(trend[0]).toMatchObject({
      revenue: 200,
      expenses: 20,
      net: 180,
      prevYearRevenue: 180,
      prevYearNet: 150,
    });
  });

  it('spans the full month bucket range of the period', () => {
    const trend = computeRevenueTrend({
      reservations: [],
      transactions: [],
      period: { start: '2026-01-15', end: '2026-03-02' },
    });

    expect(trend.map((point) => point.month)).toEqual(['2026-01', '2026-02', '2026-03']);
  });
});

describe('computeOccupancyTrend', () => {
  it('returns one entry per property and month', () => {
    const points = computeOccupancyTrend({
      reservations: [],
      properties: [makeProperty(), makeProperty({ id: 'prop-2', name: 'Villa Palmeraie' })],
      months: ['2026-04', '2026-05'],
    });

    expect(points).toHaveLength(4);
  });

  it('excludes cancelled reservations from occupancy', () => {
    const points = computeOccupancyTrend({
      reservations: [
        makeReservation({
          status: 'cancelled',
          check_in_date: '2026-04-01',
          check_out_date: '2026-05-01',
        }),
      ],
      properties: [makeProperty()],
      months: ['2026-04'],
    });

    expect(points[0]).toMatchObject({ occupiedDays: 0, rate: 0 });
  });

  it('isolates occupancy by property', () => {
    const points = computeOccupancyTrend({
      reservations: [
        makeReservation({ property_id: 'prop-1', check_in_date: '2026-04-10', check_out_date: '2026-04-15' }),
        makeReservation({ id: 'res-2', property_id: 'prop-2', check_in_date: '2026-04-20', check_out_date: '2026-04-22' }),
      ],
      properties: [makeProperty(), makeProperty({ id: 'prop-2', name: 'Villa Palmeraie' })],
      months: ['2026-04'],
    });

    expect(points.find((point) => point.propertyId === 'prop-1')?.occupiedDays).toBe(5);
    expect(points.find((point) => point.propertyId === 'prop-2')?.occupiedDays).toBe(2);
  });
});

describe('computeLeadTimeDist', () => {
  it('assigns 0-day lead time to the first bucket', () => {
    const buckets = computeLeadTimeDist([
      makeReservation({ created_at: '2026-04-10T00:00:00Z', check_in_date: '2026-04-10' }),
    ]);

    expect(buckets[0]).toMatchObject({ label: '0–7 j', count: 1 });
  });

  it('assigns 8-day lead time to the second bucket', () => {
    const buckets = computeLeadTimeDist([
      makeReservation({ created_at: '2026-04-02T00:00:00Z', check_in_date: '2026-04-10' }),
    ]);

    expect(buckets[1]).toMatchObject({ label: '8–14 j', count: 1 });
  });

  it('assigns 61-day lead time to the last bucket', () => {
    const buckets = computeLeadTimeDist([
      makeReservation({ created_at: '2026-02-08T00:00:00Z', check_in_date: '2026-04-10' }),
    ]);

    expect(buckets[4]).toMatchObject({ label: '60+ j', count: 1 });
  });

  it('excludes cancelled reservations', () => {
    const buckets = computeLeadTimeDist([
      makeReservation({ status: 'cancelled', created_at: '2026-04-01T00:00:00Z', check_in_date: '2026-04-10' }),
      makeReservation({ id: 'active', created_at: '2026-04-10T00:00:00Z', check_in_date: '2026-04-10' }),
    ]);

    expect(buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(1);
  });

  it('returns percentages that sum to 1 when reservations are present', () => {
    const buckets = computeLeadTimeDist([
      makeReservation({ id: 'b1', created_at: '2026-04-10T00:00:00Z', check_in_date: '2026-04-10' }),
      makeReservation({ id: 'b2', created_at: '2026-04-02T00:00:00Z', check_in_date: '2026-04-10' }),
      makeReservation({ id: 'b3', created_at: '2026-03-26T00:00:00Z', check_in_date: '2026-04-10' }),
      makeReservation({ id: 'b4', created_at: '2026-03-05T00:00:00Z', check_in_date: '2026-04-10' }),
      makeReservation({ id: 'b5', created_at: '2026-01-01T00:00:00Z', check_in_date: '2026-04-10' }),
    ]);

    expect(buckets.reduce((sum, bucket) => sum + bucket.pct, 0)).toBeCloseTo(1);
  });

  it('returns zeroed buckets for empty input', () => {
    const buckets = computeLeadTimeDist([]);

    expect(buckets).toHaveLength(5);
    expect(buckets.every((bucket) => bucket.count === 0 && bucket.pct === 0)).toBe(true);
  });
});

describe('computeSourceBreakdown', () => {
  it('maps a null external source to manual', () => {
    const breakdown = computeSourceBreakdown([makeReservation({ external_source: null })]);

    expect(breakdown[0]?.source).toBe('manual');
  });

  it('sums revenue by source', () => {
    const breakdown = computeSourceBreakdown([
      makeReservation({ external_source: 'airbnb', total_amount: 100 }),
      makeReservation({ id: 'res-2', external_source: 'airbnb', total_amount: 140 }),
    ]);

    expect(breakdown[0]).toMatchObject({ source: 'airbnb', revenue: 240, count: 2 });
  });

  it('returns percentages that sum to 1', () => {
    const breakdown = computeSourceBreakdown([
      makeReservation({ external_source: 'airbnb' }),
      makeReservation({ id: 'res-2', external_source: 'booking' }),
      makeReservation({ id: 'res-3', external_source: null }),
    ]);

    expect(breakdown.reduce((sum, item) => sum + item.pct, 0)).toBeCloseTo(1);
  });

  it('sorts sources by count descending', () => {
    const breakdown = computeSourceBreakdown([
      makeReservation({ external_source: 'booking' }),
      makeReservation({ id: 'res-2', external_source: 'airbnb' }),
      makeReservation({ id: 'res-3', external_source: 'airbnb' }),
    ]);

    expect(breakdown.map((item) => item.source)).toEqual(['airbnb', 'booking']);
  });
});

describe('computeRevPAN', () => {
  const aprilPeriod: Period = { start: '2026-04-01', end: '2026-04-30' };

  it('computes revpan as revenue divided by available nights', () => {
    const rows = computeRevPAN({
      reservations: [makeReservation({ total_amount: 300 })],
      properties: [makeProperty()],
      period: aprilPeriod,
    });

    expect(rows[0]).toMatchObject({ revenue: 300, availableNights: 30, revpan: 10 });
  });

  it('returns zero when there is no revenue', () => {
    const rows = computeRevPAN({
      reservations: [],
      properties: [makeProperty()],
      period: aprilPeriod,
    });

    expect(rows[0]?.revpan).toBe(0);
  });

  it('sorts properties by revpan descending', () => {
    const rows = computeRevPAN({
      reservations: [
        makeReservation({ property_id: 'prop-1', total_amount: 90 }),
        makeReservation({ id: 'res-2', property_id: 'prop-2', total_amount: 300 }),
      ],
      properties: [makeProperty(), makeProperty({ id: 'prop-2', name: 'Villa Palmeraie' })],
      period: { start: '2026-04-01', end: '2026-04-10' },
    });

    expect(rows.map((row) => row.propertyId)).toEqual(['prop-2', 'prop-1']);
  });
});

describe('computeAvgLengthOfStay', () => {
  it('computes the basic average', () => {
    const avg = computeAvgLengthOfStay([
      makeReservation({ check_in_date: '2026-04-01', check_out_date: '2026-04-03' }),
      makeReservation({ id: 'res-2', check_in_date: '2026-04-10', check_out_date: '2026-04-15' }),
    ]);

    expect(avg).toBe(3.5);
  });

  it('excludes cancelled reservations', () => {
    const avg = computeAvgLengthOfStay([
      makeReservation({ status: 'cancelled', check_in_date: '2026-04-01', check_out_date: '2026-04-20' }),
      makeReservation({ id: 'res-2', check_in_date: '2026-04-10', check_out_date: '2026-04-12' }),
    ]);

    expect(avg).toBe(2);
  });

  it('returns zero for empty input', () => {
    expect(computeAvgLengthOfStay([])).toBe(0);
  });
});

describe('computeAvgLeadTime', () => {
  it('computes the average lead time in days', () => {
    const avg = computeAvgLeadTime([
      makeReservation({ created_at: '2026-04-08T00:00:00Z', check_in_date: '2026-04-10' }),
      makeReservation({ id: 'res-2', created_at: '2026-04-01T00:00:00Z', check_in_date: '2026-04-10' }),
    ]);

    expect(avg).toBe(5.5);
  });

  it('returns zero for empty input', () => {
    expect(computeAvgLeadTime([])).toBe(0);
  });
});

describe('computeKpiDelta', () => {
  it('returns an upward trend for higher current values', () => {
    expect(computeKpiDelta(120, 100)).toMatchObject({
      delta: 20,
      pctChange: 0.2,
      trend: 'up',
    });
  });

  it('returns a downward trend for lower current values', () => {
    expect(computeKpiDelta(80, 100)).toMatchObject({
      delta: -20,
      pctChange: -0.2,
      trend: 'down',
    });
  });

  it('returns a flat trend for near-zero deltas', () => {
    expect(computeKpiDelta(10.0004, 10)).toMatchObject({ trend: 'flat' });
  });

  it('returns a null percentage change when previous is zero', () => {
    expect(computeKpiDelta(10, 0).pctChange).toBeNull();
  });

  it('keeps the negative delta value', () => {
    expect(computeKpiDelta(2, 5).delta).toBe(-3);
  });
});

describe('exportAnalyticsCsv', () => {
  it('includes the header row', () => {
    const csv = exportAnalyticsCsv([]);
    expect(csv.startsWith('Mois;Revenus;Dépenses;Net;Revenus N-1;Net N-1')).toBe(true);
  });

  it('uses semicolon delimiters', () => {
    const csv = exportAnalyticsCsv([
      {
        month: '2026-04',
        revenue: 10,
        expenses: 5,
        net: 5,
        prevYearRevenue: null,
        prevYearNet: null,
      },
    ]);

    expect(csv.split('\r\n')[1]).toBe('2026-04;10;5;5;;');
  });

  it('renders one row per month', () => {
    const csv = exportAnalyticsCsv([
      {
        month: '2026-04',
        revenue: 10,
        expenses: 5,
        net: 5,
        prevYearRevenue: null,
        prevYearNet: null,
      },
      {
        month: '2026-05',
        revenue: 20,
        expenses: 8,
        net: 12,
        prevYearRevenue: 7,
        prevYearNet: 4,
      },
    ]);

    expect(csv.split('\r\n')).toHaveLength(3);
  });

  it('returns only the header when input is empty', () => {
    expect(exportAnalyticsCsv([]).split('\r\n')).toEqual([
      'Mois;Revenus;Dépenses;Net;Revenus N-1;Net N-1',
    ]);
  });
});

describe('computeAnalyticsSummary', () => {
  const aprilPeriod: Period = { start: '2026-04-01', end: '2026-04-30' };

  it('computes revenue KPI with current and previous income sources', () => {
    const summary = computeAnalyticsSummary({
      reservations: [makeReservation({ total_amount: 200 })],
      reservationsPrev: [makeReservation({ id: 'prev', check_in_date: '2025-04-10', check_out_date: '2025-04-12', total_amount: 150 })],
      transactions: [
        makeTx({ kind: 'income', amount: 50, occurred_on: '2026-04-15' }),
        makeTx({ id: 'prev-tx', kind: 'income', amount: 25, occurred_on: '2025-04-15' }),
      ],
      properties: [makeProperty()],
      period: aprilPeriod,
    });

    expect(summary.kpi.revenue).toMatchObject({
      current: 250,
      previous: 175,
      delta: 75,
      trend: 'up',
    });
  });

  it('scopes the summary to the selected property', () => {
    const summary = computeAnalyticsSummary({
      reservations: [
        makeReservation({ property_id: 'prop-1', total_amount: 100 }),
        makeReservation({ id: 'res-2', property_id: 'prop-2', total_amount: 300 }),
      ],
      reservationsPrev: [],
      transactions: [],
      properties: [makeProperty(), makeProperty({ id: 'prop-2', name: 'Villa Palmeraie' })],
      period: aprilPeriod,
      propertyFilter: 'prop-2',
    });

    expect(summary.revPAN).toHaveLength(1);
    expect(summary.revPAN[0]?.propertyId).toBe('prop-2');
    expect(summary.kpi.reservations.current).toBe(1);
  });

  it('computes current-period occupancy points for the selected months', () => {
    const summary = computeAnalyticsSummary({
      reservations: [
        makeReservation({ check_in_date: '2026-04-01', check_out_date: '2026-04-06' }),
      ],
      reservationsPrev: [],
      transactions: [],
      properties: [makeProperty()],
      period: aprilPeriod,
    });

    expect(summary.occupancyTrend).toHaveLength(1);
    expect(summary.occupancyTrend[0]?.occupiedDays).toBe(5);
  });
});
