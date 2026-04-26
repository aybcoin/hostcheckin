import { describe, expect, it } from 'vitest';
import {
  computeMaintenanceExpenses,
  computePnL,
  computeReservationRevenue,
  isWithinPeriod,
  monthBucket,
  resolvePeriod,
  sortTransactions,
} from '../../src/lib/finance-logic';
import {
  TRANSACTION_CATEGORIES,
  type FinanceTransactionWithRelations,
  type Period,
} from '../../src/types/finance';

const FIXED_NOW = new Date('2026-04-25T12:00:00Z');

type ReservationInput = Parameters<typeof computeReservationRevenue>[0][number];
type MaintenanceInput = Parameters<typeof computeMaintenanceExpenses>[0][number];
type ComputePnLInput = Parameters<typeof computePnL>[0];

function makeReservation(overrides: Partial<ReservationInput> = {}): ReservationInput {
  return {
    property_id: 'prop-1',
    status: 'checked_out',
    total_amount: 250,
    check_out_date: '2026-04-10',
    ...overrides,
  };
}

function makeTicket(overrides: Partial<MaintenanceInput> = {}): MaintenanceInput {
  return {
    property_id: 'prop-1',
    cost_actual: 80,
    resolved_at: '2026-04-20T09:30:00Z',
    closed_at: null,
    updated_at: '2026-04-22T16:00:00Z',
    ...overrides,
  };
}

function makeTransaction(overrides: Partial<FinanceTransactionWithRelations> = {}): FinanceTransactionWithRelations {
  return {
    id: 'tx-1',
    host_id: 'host-1',
    property_id: 'prop-1',
    kind: 'expense',
    category: 'utilities',
    amount: 40,
    currency: 'EUR',
    occurred_on: '2026-02-10',
    description: null,
    notes: null,
    created_at: '2026-02-10T10:00:00Z',
    updated_at: '2026-02-10T10:00:00Z',
    ...overrides,
  };
}

const PERIOD_APRIL: Period = { start: '2026-04-01', end: '2026-04-30' };

describe('resolvePeriod', () => {
  it('resolves this_month', () => {
    expect(resolvePeriod('this_month', undefined, FIXED_NOW)).toEqual({
      start: '2026-04-01',
      end: '2026-04-30',
    });
  });

  it('resolves last_month', () => {
    expect(resolvePeriod('last_month', undefined, FIXED_NOW)).toEqual({
      start: '2026-03-01',
      end: '2026-03-31',
    });
  });

  it('resolves last_30_days', () => {
    expect(resolvePeriod('last_30_days', undefined, FIXED_NOW)).toEqual({
      start: '2026-03-27',
      end: '2026-04-25',
    });
  });

  it('resolves last_90_days', () => {
    expect(resolvePeriod('last_90_days', undefined, FIXED_NOW)).toEqual({
      start: '2026-01-26',
      end: '2026-04-25',
    });
  });

  it('resolves this_year', () => {
    expect(resolvePeriod('this_year', undefined, FIXED_NOW)).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    });
  });

  it('resolves last_year', () => {
    expect(resolvePeriod('last_year', undefined, FIXED_NOW)).toEqual({
      start: '2025-01-01',
      end: '2025-12-31',
    });
  });

  it('resolves custom when provided', () => {
    const custom: Period = { start: '2026-02-01', end: '2026-02-15' };
    expect(resolvePeriod('custom', custom, FIXED_NOW)).toEqual(custom);
  });

  it('throws on custom preset when period is missing', () => {
    expect(() => resolvePeriod('custom', undefined, FIXED_NOW)).toThrow(/Custom period is required/i);
  });
});

describe('isWithinPeriod', () => {
  const period: Period = { start: '2026-04-01', end: '2026-04-30' };

  it('includes the start boundary', () => {
    expect(isWithinPeriod('2026-04-01', period)).toBe(true);
  });

  it('includes the end boundary', () => {
    expect(isWithinPeriod('2026-04-30', period)).toBe(true);
  });

  it('excludes dates before the start', () => {
    expect(isWithinPeriod('2026-03-31', period)).toBe(false);
  });

  it('excludes dates after the end', () => {
    expect(isWithinPeriod('2026-05-01', period)).toBe(false);
  });
});

describe('monthBucket', () => {
  it('extracts yyyy-mm from a date string', () => {
    expect(monthBucket('2026-04-25')).toBe('2026-04');
  });

  it('extracts yyyy-mm from an iso timestamp', () => {
    expect(monthBucket('2026-01-05T11:12:13Z')).toBe('2026-01');
  });
});

describe('computeReservationRevenue', () => {
  it('keeps only checked_in/checked_out/completed statuses', () => {
    const result = computeReservationRevenue([
      makeReservation({ status: 'checked_in', total_amount: 10 }),
      makeReservation({ status: 'checked_out', total_amount: 20 }),
      makeReservation({ status: 'completed', total_amount: 30 }),
      makeReservation({ status: 'pending', total_amount: 40 }),
      makeReservation({ status: 'cancelled', total_amount: 50 }),
    ], PERIOD_APRIL);

    expect(result.map((entry) => entry.amount)).toEqual([10, 20, 30]);
  });

  it('excludes null/negative amounts', () => {
    const result = computeReservationRevenue([
      makeReservation({ total_amount: null }),
      makeReservation({ total_amount: -1 }),
      makeReservation({ total_amount: 0 }),
      makeReservation({ total_amount: 10 }),
    ], PERIOD_APRIL);
    expect(result.map((entry) => entry.amount)).toEqual([0, 10]);
  });

  it('excludes reservations outside the period', () => {
    const result = computeReservationRevenue([
      makeReservation({ check_out_date: '2026-03-31' }),
      makeReservation({ check_out_date: '2026-04-15' }),
      makeReservation({ check_out_date: '2026-05-01' }),
    ], PERIOD_APRIL);
    expect(result).toHaveLength(1);
    expect(result[0]?.occurred_on).toBe('2026-04-15');
  });

  it('applies property filter when specified', () => {
    const result = computeReservationRevenue([
      makeReservation({ property_id: 'prop-1', total_amount: 11 }),
      makeReservation({ property_id: 'prop-2', total_amount: 22 }),
    ], PERIOD_APRIL, 'prop-2');

    expect(result).toHaveLength(1);
    expect(result[0]?.property_id).toBe('prop-2');
    expect(result[0]?.amount).toBe(22);
  });

  it('uses check_out_date as occurred_on', () => {
    const result = computeReservationRevenue([
      makeReservation({ check_out_date: '2026-04-29' }),
    ], PERIOD_APRIL);

    expect(result[0]?.occurred_on).toBe('2026-04-29');
  });
});

describe('computeMaintenanceExpenses', () => {
  it('excludes null/zero/negative costs', () => {
    const result = computeMaintenanceExpenses([
      makeTicket({ cost_actual: null }),
      makeTicket({ cost_actual: 0 }),
      makeTicket({ cost_actual: -4 }),
      makeTicket({ cost_actual: 21 }),
    ], PERIOD_APRIL);
    expect(result.map((entry) => entry.amount)).toEqual([21]);
  });

  it('uses resolved_at as first recognition date', () => {
    const result = computeMaintenanceExpenses([
      makeTicket({
        cost_actual: 99,
        resolved_at: '2026-04-05T10:00:00Z',
        closed_at: '2026-04-10T10:00:00Z',
        updated_at: '2026-04-15T10:00:00Z',
      }),
    ], PERIOD_APRIL);

    expect(result[0]?.occurred_on).toBe('2026-04-05');
  });

  it('falls back to closed_at when resolved_at is null', () => {
    const result = computeMaintenanceExpenses([
      makeTicket({
        resolved_at: null,
        closed_at: '2026-04-18T09:00:00Z',
        updated_at: '2026-04-20T09:00:00Z',
      }),
    ], PERIOD_APRIL);

    expect(result[0]?.occurred_on).toBe('2026-04-18');
  });

  it('falls back to updated_at when resolved_at and closed_at are null', () => {
    const result = computeMaintenanceExpenses([
      makeTicket({
        resolved_at: null,
        closed_at: null,
        updated_at: '2026-04-22T09:00:00Z',
      }),
    ], PERIOD_APRIL);

    expect(result[0]?.occurred_on).toBe('2026-04-22');
  });

  it('applies property filter', () => {
    const result = computeMaintenanceExpenses([
      makeTicket({ property_id: 'prop-1', cost_actual: 5 }),
      makeTicket({ property_id: 'prop-2', cost_actual: 6 }),
    ], PERIOD_APRIL, 'prop-2');

    expect(result).toHaveLength(1);
    expect(result[0]?.property_id).toBe('prop-2');
    expect(result[0]?.amount).toBe(6);
  });

  it('excludes expenses outside the period', () => {
    const result = computeMaintenanceExpenses([
      makeTicket({ resolved_at: '2026-03-30T10:00:00Z' }),
      makeTicket({ resolved_at: '2026-04-10T10:00:00Z' }),
      makeTicket({ resolved_at: '2026-05-01T10:00:00Z' }),
    ], PERIOD_APRIL);

    expect(result).toHaveLength(1);
    expect(result[0]?.occurred_on).toBe('2026-04-10');
  });
});

describe('computePnL', () => {
  const period: Period = { start: '2026-01-01', end: '2026-03-31' };

  const baseInput: ComputePnLInput = {
    reservations: [
      makeReservation({ property_id: 'prop-1', status: 'checked_out', total_amount: 500, check_out_date: '2026-01-15' }),
      makeReservation({ property_id: 'prop-2', status: 'checked_in', total_amount: 200, check_out_date: '2026-03-01' }),
      makeReservation({ property_id: 'prop-2', status: 'pending', total_amount: 999, check_out_date: '2026-02-15' }),
    ],
    tickets: [
      makeTicket({ property_id: 'prop-1', cost_actual: 100, resolved_at: '2026-01-20T10:00:00Z', closed_at: null }),
      makeTicket({ property_id: 'prop-2', cost_actual: 50, resolved_at: null, closed_at: '2026-03-05T10:00:00Z' }),
      makeTicket({ property_id: 'prop-3', cost_actual: 80, resolved_at: null, closed_at: null, updated_at: '2026-02-01T10:00:00Z' }),
    ],
    transactions: [
      makeTransaction({ id: 'tx-1', property_id: 'prop-1', kind: 'income', category: 'other_income', amount: 120, occurred_on: '2026-02-10' }),
      makeTransaction({ id: 'tx-2', property_id: 'prop-2', kind: 'expense', category: 'utilities', amount: 70, occurred_on: '2026-02-11' }),
      makeTransaction({ id: 'tx-3', property_id: null, kind: 'expense', category: 'supplies', amount: 40, occurred_on: '2026-02-12' }),
      makeTransaction({ id: 'tx-4', property_id: 'prop-1', kind: 'expense', category: 'laundry', amount: 30, occurred_on: '2025-12-31' }),
      makeTransaction({ id: 'tx-5', property_id: 'prop-1', kind: 'income', category: 'reservation', amount: 60, occurred_on: '2026-02-15' }),
    ],
    properties: [
      { id: 'prop-1', name: 'Atlas' },
      { id: 'prop-2', name: 'Riad' },
    ],
    period,
    propertyFilter: 'all',
  };

  it('computes net as revenue minus expenses', () => {
    const pnl = computePnL(baseInput);
    expect(pnl.revenue).toBe(880);
    expect(pnl.expenses).toBe(340);
    expect(pnl.net).toBe(pnl.revenue - pnl.expenses);
  });

  it('keeps byProperty revenue sum aligned with total revenue', () => {
    const pnl = computePnL(baseInput);
    const total = pnl.byProperty.reduce((sum, row) => sum + row.revenue, 0);
    expect(total).toBe(pnl.revenue);
  });

  it('keeps byProperty expenses sum aligned with total expenses', () => {
    const pnl = computePnL(baseInput);
    const total = pnl.byProperty.reduce((sum, row) => sum + row.expenses, 0);
    expect(total).toBe(pnl.expenses);
  });

  it('keeps byMonth revenue sum aligned with total revenue', () => {
    const pnl = computePnL(baseInput);
    const total = pnl.byMonth.reduce((sum, row) => sum + row.revenue, 0);
    expect(total).toBe(pnl.revenue);
  });

  it('builds byMonth without gaps across the period', () => {
    const pnl = computePnL(baseInput);
    expect(pnl.byMonth.map((row) => row.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
  });

  it('always returns all transaction categories in byCategory', () => {
    const pnl = computePnL(baseInput);
    TRANSACTION_CATEGORIES.forEach((category) => {
      expect(pnl.byCategory).toHaveProperty(category);
      expect(typeof pnl.byCategory[category]).toBe('number');
    });
    expect(pnl.byCategory.cleaning).toBe(0);
    expect(pnl.byCategory.platform_fee).toBe(0);
    expect(pnl.byCategory.tax).toBe(0);
  });

  it('sorts byProperty by revenue descending', () => {
    const pnl = computePnL(baseInput);
    expect(pnl.byProperty.map((row) => row.property_id).slice(0, 2)).toEqual(['prop-1', 'prop-2']);
  });

  it('keeps a zeroed property row when property filter has no matching records', () => {
    const pnl = computePnL({
      ...baseInput,
      propertyFilter: 'prop-missing',
      reservations: [],
      tickets: [],
      transactions: [],
      properties: [],
    });

    expect(pnl.byProperty).toEqual([
      {
        property_id: 'prop-missing',
        property_name: 'prop-missing',
        revenue: 0,
        expenses: 0,
        net: 0,
      },
    ]);
  });
});

describe('sortTransactions', () => {
  it('sorts by occurred_on descending', () => {
    const sorted = sortTransactions([
      makeTransaction({ id: 'a', occurred_on: '2026-01-10', amount: 1 }),
      makeTransaction({ id: 'b', occurred_on: '2026-02-10', amount: 1 }),
    ]);
    expect(sorted.map((transaction) => transaction.id)).toEqual(['b', 'a']);
  });

  it('sorts by amount descending when occurred_on is equal', () => {
    const sorted = sortTransactions([
      makeTransaction({ id: 'a', occurred_on: '2026-02-10', amount: 15 }),
      makeTransaction({ id: 'b', occurred_on: '2026-02-10', amount: 40 }),
    ]);
    expect(sorted.map((transaction) => transaction.id)).toEqual(['b', 'a']);
  });

  it('does not mutate the input array', () => {
    const input = [
      makeTransaction({ id: 'a', occurred_on: '2026-02-11' }),
      makeTransaction({ id: 'b', occurred_on: '2026-02-10' }),
    ];
    const snapshot = input.map((transaction) => transaction.id);
    sortTransactions(input);
    expect(input.map((transaction) => transaction.id)).toEqual(snapshot);
  });
});
