import type { Reservation, Property } from './supabase';
import type { MaintenanceTicket } from '../types/maintenance';
import {
  TRANSACTION_CATEGORIES,
  type FinanceTransactionWithRelations,
  type Period,
  type PeriodPreset,
  type PnLSummary,
  type TransactionCategory,
} from '../types/finance';

type ReservationRevenueEntry = Pick<
  Reservation,
  'property_id' | 'status' | 'total_amount' | 'check_out_date'
>;

type MaintenanceExpenseEntry = Pick<
  MaintenanceTicket,
  'property_id' | 'cost_actual' | 'resolved_at' | 'closed_at' | 'updated_at'
>;

interface ComputePnLParams {
  reservations: readonly ReservationRevenueEntry[];
  tickets: readonly MaintenanceExpenseEntry[];
  transactions: readonly FinanceTransactionWithRelations[];
  properties: readonly Pick<Property, 'id' | 'name'>[];
  period: Period;
  propertyFilter?: string | 'all';
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const UNASSIGNED_PROPERTY_ID = '__unassigned__';
const RESERVATION_REVENUE_STATUSES = new Set<Reservation['status']>([
  'checked_in',
  'checked_out',
  'completed',
]);

function toUtcStartOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function dateToYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function firstDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function lastDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function buildMonthBuckets(period: Period): string[] {
  const [startYear, startMonth] = period.start.slice(0, 7).split('-').map(Number);
  const [endYear, endMonth] = period.end.slice(0, 7).split('-').map(Number);

  if (!Number.isFinite(startYear) || !Number.isFinite(startMonth)) return [];
  if (!Number.isFinite(endYear) || !Number.isFinite(endMonth)) return [];

  const buckets: string[] = [];
  const cursor = new Date(Date.UTC(startYear, startMonth - 1, 1));
  const last = new Date(Date.UTC(endYear, endMonth - 1, 1));

  while (cursor.getTime() <= last.getTime()) {
    buckets.push(dateToYmd(cursor).slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return buckets;
}

function shouldIncludeProperty(propertyId: string | null | undefined, propertyFilter?: string | 'all'): boolean {
  if (!propertyFilter || propertyFilter === 'all') return true;
  return propertyId === propertyFilter;
}

function createZeroedCategoryMap(): Record<TransactionCategory, number> {
  return {
    reservation: 0,
    laundry: 0,
    cleaning: 0,
    utilities: 0,
    platform_fee: 0,
    tax: 0,
    supplies: 0,
    other_income: 0,
    other_expense: 0,
  };
}

// Single source of truth lives in `src/lib/format.ts` — re-exported for backward compat.
export { formatCurrency } from './format';

export function resolvePeriod(preset: PeriodPreset, custom?: Period, now: Date = new Date()): Period {
  const today = toUtcStartOfDay(now);
  const year = today.getUTCFullYear();

  switch (preset) {
    case 'this_month': {
      return {
        start: dateToYmd(firstDayOfMonth(today)),
        end: dateToYmd(lastDayOfMonth(today)),
      };
    }
    case 'last_month': {
      const previousMonth = new Date(Date.UTC(year, today.getUTCMonth() - 1, 1));
      return {
        start: dateToYmd(firstDayOfMonth(previousMonth)),
        end: dateToYmd(lastDayOfMonth(previousMonth)),
      };
    }
    case 'last_30_days':
      return {
        start: dateToYmd(addUtcDays(today, -29)),
        end: dateToYmd(today),
      };
    case 'last_90_days':
      return {
        start: dateToYmd(addUtcDays(today, -89)),
        end: dateToYmd(today),
      };
    case 'this_year':
      return {
        start: `${year}-01-01`,
        end: `${year}-12-31`,
      };
    case 'last_year': {
      const previousYear = year - 1;
      return {
        start: `${previousYear}-01-01`,
        end: `${previousYear}-12-31`,
      };
    }
    case 'custom':
      if (!custom) {
        throw new Error('Custom period is required when preset is "custom".');
      }
      return { start: custom.start, end: custom.end };
    default:
      return {
        start: dateToYmd(firstDayOfMonth(today)),
        end: dateToYmd(lastDayOfMonth(today)),
      };
  }
}

export function isWithinPeriod(dateStr: string, period: Period): boolean {
  const date = dateStr.slice(0, 10);
  return date >= period.start && date <= period.end;
}

export function monthBucket(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function computeReservationRevenue(
  reservations: readonly ReservationRevenueEntry[],
  period: Period,
  propertyId?: string | 'all',
): Array<{ property_id: string; amount: number; occurred_on: string }> {
  return reservations
    .filter((reservation) => RESERVATION_REVENUE_STATUSES.has(reservation.status))
    .filter(
      (reservation) =>
        reservation.total_amount != null
        && Number.isFinite(reservation.total_amount)
        && reservation.total_amount >= 0,
    )
    .filter((reservation) => isWithinPeriod(reservation.check_out_date, period))
    .filter((reservation) => shouldIncludeProperty(reservation.property_id, propertyId))
    .map((reservation) => ({
      property_id: reservation.property_id,
      amount: reservation.total_amount as number,
      occurred_on: reservation.check_out_date.slice(0, 10),
    }));
}

export function computeMaintenanceExpenses(
  tickets: readonly MaintenanceExpenseEntry[],
  period: Period,
  propertyId?: string | 'all',
): Array<{ property_id: string; amount: number; occurred_on: string }> {
  return tickets
    .filter(
      (ticket) =>
        ticket.cost_actual != null
        && Number.isFinite(ticket.cost_actual)
        && ticket.cost_actual > 0,
    )
    .map((ticket) => {
      const occurredOn = (ticket.resolved_at ?? ticket.closed_at ?? ticket.updated_at).slice(0, 10);
      return {
        property_id: ticket.property_id,
        amount: ticket.cost_actual as number,
        occurred_on: occurredOn,
      };
    })
    .filter((expense) => isWithinPeriod(expense.occurred_on, period))
    .filter((expense) => shouldIncludeProperty(expense.property_id, propertyId));
}

export function computePnL({
  reservations,
  tickets,
  transactions,
  properties,
  period,
  propertyFilter = 'all',
}: ComputePnLParams): PnLSummary {
  const categoryTotals = createZeroedCategoryMap();
  const byPropertyMap = new Map<
  string,
  {
    property_id: string;
    property_name: string;
    revenue: number;
    expenses: number;
    net: number;
  }
  >();
  const propertyNameMap = new Map(properties.map((property) => [property.id, property.name]));

  const months = buildMonthBuckets(period);
  const byMonthMap = new Map(
    months.map((month) => [
      month,
      { month, revenue: 0, expenses: 0, net: 0 },
    ]),
  );

  let totalRevenue = 0;
  let totalExpenses = 0;
  let totalTransactions = 0;

  const ensurePropertyRow = (propertyId: string | null | undefined) => {
    const normalizedId = propertyId ?? UNASSIGNED_PROPERTY_ID;
    const existing = byPropertyMap.get(normalizedId);
    if (existing) return existing;

    const propertyName =
      normalizedId === UNASSIGNED_PROPERTY_ID
        ? 'Aucun logement'
        : propertyNameMap.get(normalizedId) ?? normalizedId;

    const row = {
      property_id: normalizedId,
      property_name: propertyName,
      revenue: 0,
      expenses: 0,
      net: 0,
    };
    byPropertyMap.set(normalizedId, row);
    return row;
  };

  const applyEntry = (
    entry: {
      property_id: string | null;
      amount: number;
      occurred_on: string;
    },
    kind: 'income' | 'expense',
    category: TransactionCategory,
  ) => {
    if (!Number.isFinite(entry.amount) || entry.amount < 0) return;

    const occurredOn = entry.occurred_on.slice(0, 10);
    if (!isWithinPeriod(occurredOn, period)) return;

    const month = monthBucket(occurredOn);
    const monthRow = byMonthMap.get(month);

    if (kind === 'income') {
      totalRevenue += entry.amount;
      if (monthRow) monthRow.revenue += entry.amount;
    } else {
      totalExpenses += entry.amount;
      if (monthRow) monthRow.expenses += entry.amount;
    }

    categoryTotals[category] += entry.amount;
    totalTransactions += 1;

    const propertyRow = ensurePropertyRow(entry.property_id);
    if (kind === 'income') {
      propertyRow.revenue += entry.amount;
    } else {
      propertyRow.expenses += entry.amount;
    }
    propertyRow.net = propertyRow.revenue - propertyRow.expenses;
  };

  const reservationRevenue = computeReservationRevenue(reservations, period, propertyFilter);
  reservationRevenue.forEach((entry) => {
    applyEntry(
      {
        property_id: entry.property_id,
        amount: entry.amount,
        occurred_on: entry.occurred_on,
      },
      'income',
      'reservation',
    );
  });

  const maintenanceExpenses = computeMaintenanceExpenses(tickets, period, propertyFilter);
  maintenanceExpenses.forEach((entry) => {
    applyEntry(
      {
        property_id: entry.property_id,
        amount: entry.amount,
        occurred_on: entry.occurred_on,
      },
      'expense',
      'other_expense',
    );
  });

  transactions
    .filter((transaction) => shouldIncludeProperty(transaction.property_id, propertyFilter))
    .filter((transaction) => isWithinPeriod(transaction.occurred_on, period))
    .forEach((transaction) => {
      if (!TRANSACTION_CATEGORIES.includes(transaction.category)) return;
      applyEntry(
        {
          property_id: transaction.property_id,
          amount: transaction.amount,
          occurred_on: transaction.occurred_on,
        },
        transaction.kind,
        transaction.category,
      );
    });

  if (propertyFilter !== 'all') {
    ensurePropertyRow(propertyFilter);
  }

  const byMonth = months.map((month) => {
    const row = byMonthMap.get(month);
    if (!row) {
      return { month, revenue: 0, expenses: 0, net: 0 };
    }
    return {
      month,
      revenue: row.revenue,
      expenses: row.expenses,
      net: row.revenue - row.expenses,
    };
  });

  const byProperty = Array.from(byPropertyMap.values())
    .map((row) => ({
      ...row,
      net: row.revenue - row.expenses,
    }))
    .sort((a, b) => {
      const revenueDiff = b.revenue - a.revenue;
      if (revenueDiff !== 0) return revenueDiff;
      return a.property_name.localeCompare(b.property_name, 'fr-FR');
    });

  return {
    revenue: totalRevenue,
    expenses: totalExpenses,
    net: totalRevenue - totalExpenses,
    transactions: totalTransactions,
    byCategory: categoryTotals,
    byProperty,
    byMonth,
  };
}

export function sortTransactions<T extends Pick<FinanceTransactionWithRelations, 'occurred_on' | 'amount' | 'id'>>(
  transactions: readonly T[],
): T[] {
  return transactions.slice().sort((a, b) => {
    const dateDiff = b.occurred_on.localeCompare(a.occurred_on);
    if (dateDiff !== 0) return dateDiff;

    const amountDiff = b.amount - a.amount;
    if (amountDiff !== 0) return amountDiff;

    return a.id.localeCompare(b.id);
  });
}
