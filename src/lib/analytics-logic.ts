import type { Property, Reservation } from './supabase';
import {
  isWithinPeriod,
  monthBucket,
  resolvePeriod,
} from './finance-logic';
import { computeOccupancy } from './property-stats-logic';
import type {
  AnalyticsSummary,
  KpiDelta,
  LeadTimeBucket,
  MonthlyPoint,
  OccupancyPoint,
  RevPAN,
  SourceBreakdown,
} from '../types/analytics';
import type { FinanceTransaction, Period } from '../types/finance';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LEAD_TIME_BUCKETS = [
  { label: '0–7 j', min: 0, max: 7 },
  { label: '8–14 j', min: 8, max: 14 },
  { label: '15–30 j', min: 15, max: 30 },
  { label: '31–60 j', min: 31, max: 60 },
  { label: '60+ j', min: 61, max: Number.POSITIVE_INFINITY },
] as const;

type RevenueReservation = Pick<
  Reservation,
  'property_id' | 'check_in_date' | 'check_out_date' | 'total_amount' | 'status'
>;

type RevenueTransaction = Pick<FinanceTransaction, 'amount' | 'kind' | 'occurred_on' | 'property_id'>;

type OccupancyReservation = Pick<
  Reservation,
  'property_id' | 'check_in_date' | 'check_out_date' | 'status'
>;

type OccupancyProperty = Pick<Property, 'id' | 'name'>;

type SourceKey = SourceBreakdown['source'];

function dateToYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function parseDateOnly(value: string): { year: number; month: number; day: number } | null {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function shiftDateOnlyByMonths(value: string, months: number): string {
  const parsed = parseDateOnly(value);
  if (!parsed) return value.slice(0, 10);

  const target = new Date(Date.UTC(parsed.year, parsed.month - 1 + months, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth() + 1;
  const targetDay = Math.min(parsed.day, daysInMonth(targetYear, targetMonth));

  return `${targetYear}-${pad2(targetMonth)}-${pad2(targetDay)}`;
}

function shiftMonthLabel(value: string, months: number): string {
  return shiftDateOnlyByMonths(`${value}-01`, months).slice(0, 7);
}

function shiftPeriodByMonths(period: Period, months: number): Period {
  return {
    start: shiftDateOnlyByMonths(period.start, months),
    end: shiftDateOnlyByMonths(period.end, months),
  };
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

function isActiveReservation(status: Reservation['status']): boolean {
  return status !== 'cancelled';
}

function toFiniteAmount(value: number | null | undefined): number {
  if (value == null) return 0;
  return Number.isFinite(value) ? value : 0;
}

function computeDayDiff(start: string, end: string): number {
  const diff = Date.parse(end) - Date.parse(start);
  if (!Number.isFinite(diff)) return 0;
  return Math.max(0, Math.floor(diff / MS_PER_DAY));
}

function availableNights(period: Period): number {
  const diff = Date.parse(period.end) - Date.parse(period.start);
  if (!Number.isFinite(diff)) return 0;
  return Math.max(0, Math.floor(diff / MS_PER_DAY) + 1);
}

function normalizeSource(source: Reservation['external_source']): SourceKey {
  switch (source) {
    case 'airbnb':
    case 'booking':
    case 'vrbo':
    case 'other':
      return source;
    case 'manual':
    case null:
    case undefined:
      return 'manual';
    default:
      return 'other';
  }
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function countActiveReservations(reservations: readonly Pick<Reservation, 'status'>[]): number {
  return reservations.filter((reservation) => isActiveReservation(reservation.status)).length;
}

function sumReservationRevenue(reservations: readonly RevenueReservation[], period: Period): number {
  return reservations
    .filter((reservation) => isActiveReservation(reservation.status))
    .filter((reservation) => isWithinPeriod(reservation.check_in_date, period))
    .reduce((sum, reservation) => sum + toFiniteAmount(reservation.total_amount), 0);
}

function sumTransactionIncome(transactions: readonly RevenueTransaction[], period: Period): number {
  return transactions
    .filter((transaction) => transaction.kind === 'income')
    .filter((transaction) => isWithinPeriod(transaction.occurred_on, period))
    .reduce((sum, transaction) => sum + toFiniteAmount(transaction.amount), 0);
}

function averageOccupancyRate(points: readonly OccupancyPoint[]): number {
  return average(points.map((point) => point.rate));
}

export function computeRevenueTrend(params: {
  reservations: RevenueReservation[];
  transactions: RevenueTransaction[];
  period: Period;
  propertyFilter?: string | 'all';
}): MonthlyPoint[] {
  const activePeriod = resolvePeriod('custom', params.period);
  const previousPeriod = resolvePeriod('custom', shiftPeriodByMonths(activePeriod, -12));
  const months = buildMonthBuckets(activePeriod);
  const monthly = new Map<string, { revenue: number; expenses: number }>();
  const previousMonthly = new Map<string, { revenue: number; expenses: number }>();
  const previousDataMonths = new Set<string>();

  const addMonthValue = (
    target: Map<string, { revenue: number; expenses: number }>,
    month: string,
    field: 'revenue' | 'expenses',
    amount: number,
  ) => {
    const row = target.get(month) ?? { revenue: 0, expenses: 0 };
    row[field] += amount;
    target.set(month, row);
  };

  params.reservations
    .filter((reservation) => shouldIncludeProperty(reservation.property_id, params.propertyFilter))
    .filter((reservation) => isActiveReservation(reservation.status))
    .forEach((reservation) => {
      const amount = toFiniteAmount(reservation.total_amount);
      const month = monthBucket(reservation.check_in_date);

      if (isWithinPeriod(reservation.check_in_date, activePeriod)) {
        addMonthValue(monthly, month, 'revenue', amount);
      }

      if (isWithinPeriod(reservation.check_in_date, previousPeriod)) {
        addMonthValue(previousMonthly, month, 'revenue', amount);
        previousDataMonths.add(month);
      }
    });

  params.transactions
    .filter((transaction) => shouldIncludeProperty(transaction.property_id, params.propertyFilter))
    .forEach((transaction) => {
      const amount = toFiniteAmount(transaction.amount);
      const field = transaction.kind === 'expense' ? 'expenses' : 'revenue';
      const month = monthBucket(transaction.occurred_on);

      if (isWithinPeriod(transaction.occurred_on, activePeriod)) {
        addMonthValue(monthly, month, field, amount);
      }

      if (isWithinPeriod(transaction.occurred_on, previousPeriod)) {
        addMonthValue(previousMonthly, month, field, amount);
        previousDataMonths.add(month);
      }
    });

  return months.map((month) => {
    const current = monthly.get(month) ?? { revenue: 0, expenses: 0 };
    const previousMonth = shiftMonthLabel(month, -12);
    const previous = previousMonthly.get(previousMonth) ?? { revenue: 0, expenses: 0 };
    const hasPrevious = previousDataMonths.has(previousMonth);

    return {
      month,
      revenue: current.revenue,
      expenses: current.expenses,
      net: current.revenue - current.expenses,
      prevYearRevenue: hasPrevious ? previous.revenue : null,
      prevYearNet: hasPrevious ? previous.revenue - previous.expenses : null,
    };
  });
}

export function computeOccupancyTrend(params: {
  reservations: OccupancyReservation[];
  properties: OccupancyProperty[];
  months: string[];
}): OccupancyPoint[] {
  const reservationsByProperty = new Map<string, Reservation[]>();

  params.properties.forEach((property) => {
    reservationsByProperty.set(
      property.id,
      params.reservations.filter((reservation) => reservation.property_id === property.id) as Reservation[],
    );
  });

  return params.properties.flatMap((property) =>
    params.months.map((month) => {
      const [year, numericMonth] = month.split('-').map(Number);
      const occupancy = computeOccupancy(
        reservationsByProperty.get(property.id) ?? [],
        year,
        numericMonth,
      );

      return {
        month,
        propertyId: property.id,
        propertyName: property.name,
        rate: occupancy.rate,
        occupiedDays: occupancy.occupiedDays,
        totalDays: occupancy.totalDays,
      };
    }),
  );
}

export function computeLeadTimeDist(
  reservations: Array<Pick<Reservation, 'created_at' | 'check_in_date' | 'status'>>,
): LeadTimeBucket[] {
  const counts = LEAD_TIME_BUCKETS.map((bucket) => ({ label: bucket.label, count: 0 }));

  reservations
    .filter((reservation) => isActiveReservation(reservation.status))
    .forEach((reservation) => {
      const leadTimeDays = computeDayDiff(reservation.created_at, reservation.check_in_date);
      const bucketIndex = LEAD_TIME_BUCKETS.findIndex(
        (bucket) => leadTimeDays >= bucket.min && leadTimeDays <= bucket.max,
      );

      if (bucketIndex >= 0) {
        counts[bucketIndex]!.count += 1;
      }
    });

  const total = counts.reduce((sum, bucket) => sum + bucket.count, 0);

  return counts.map((bucket) => ({
    label: bucket.label,
    count: bucket.count,
    pct: total === 0 ? 0 : bucket.count / total,
  }));
}

export function computeSourceBreakdown(
  reservations: Array<Pick<Reservation, 'external_source' | 'total_amount' | 'status'>>,
): SourceBreakdown[] {
  const totals = new Map<SourceKey, { count: number; revenue: number }>();

  reservations
    .filter((reservation) => isActiveReservation(reservation.status))
    .forEach((reservation) => {
      const source = normalizeSource(reservation.external_source);
      const row = totals.get(source) ?? { count: 0, revenue: 0 };
      row.count += 1;
      row.revenue += toFiniteAmount(reservation.total_amount);
      totals.set(source, row);
    });

  const totalCount = Array.from(totals.values()).reduce((sum, row) => sum + row.count, 0);

  return Array.from(totals.entries())
    .map(([source, row]) => ({
      source,
      count: row.count,
      revenue: row.revenue,
      pct: totalCount === 0 ? 0 : row.count / totalCount,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return right.revenue - left.revenue;
    });
}

export function computeRevPAN(params: {
  reservations: Array<Pick<Reservation, 'property_id' | 'check_in_date' | 'check_out_date' | 'total_amount' | 'status'>>;
  properties: Array<Pick<Property, 'id' | 'name'>>;
  period: Period;
}): RevPAN[] {
  const nights = availableNights(params.period);

  return params.properties
    .map((property) => {
      const revenue = params.reservations
        .filter((reservation) => reservation.property_id === property.id)
        .filter((reservation) => isActiveReservation(reservation.status))
        .filter((reservation) => isWithinPeriod(reservation.check_in_date, params.period))
        .reduce((sum, reservation) => sum + toFiniteAmount(reservation.total_amount), 0);

      return {
        propertyId: property.id,
        propertyName: property.name,
        revenue,
        availableNights: nights,
        revpan: nights === 0 ? 0 : revenue / nights,
      };
    })
    .sort((left, right) => right.revpan - left.revpan);
}

export function computeAvgLengthOfStay(
  reservations: Array<Pick<Reservation, 'check_in_date' | 'check_out_date' | 'status'>>,
): number {
  const stays = reservations
    .filter((reservation) => isActiveReservation(reservation.status))
    .map((reservation) => computeDayDiff(reservation.check_in_date, reservation.check_out_date));

  return average(stays);
}

export function computeAvgLeadTime(
  reservations: Array<Pick<Reservation, 'created_at' | 'check_in_date' | 'status'>>,
): number {
  const leadTimes = reservations
    .filter((reservation) => isActiveReservation(reservation.status))
    .map((reservation) => computeDayDiff(reservation.created_at, reservation.check_in_date));

  return average(leadTimes);
}

export function computeKpiDelta(current: number, previous: number): KpiDelta {
  const delta = current - previous;
  return {
    current,
    previous,
    delta,
    pctChange: previous === 0 ? null : delta / previous,
    trend: Math.abs(delta) < 0.001 ? 'flat' : delta > 0 ? 'up' : 'down',
  };
}

export function computeAnalyticsSummary(params: {
  reservations: Reservation[];
  reservationsPrev: Reservation[];
  transactions: FinanceTransaction[];
  properties: Property[];
  period: Period;
  propertyFilter?: string | 'all';
}): AnalyticsSummary {
  const activePeriod = resolvePeriod('custom', params.period);
  const previousPeriod = resolvePeriod('custom', shiftPeriodByMonths(activePeriod, -12));
  const scopedProperties =
    params.propertyFilter && params.propertyFilter !== 'all'
      ? params.properties.filter((property) => property.id === params.propertyFilter)
      : params.properties;

  const scopeReservations = (reservations: Reservation[], period: Period) =>
    reservations
      .filter((reservation) => shouldIncludeProperty(reservation.property_id, params.propertyFilter))
      .filter((reservation) => isWithinPeriod(reservation.check_in_date, period));

  const scopeTransactions = (transactions: FinanceTransaction[], period: Period) =>
    transactions
      .filter((transaction) => shouldIncludeProperty(transaction.property_id, params.propertyFilter))
      .filter((transaction) => isWithinPeriod(transaction.occurred_on, period));

  const currentReservations = scopeReservations(params.reservations, activePeriod);
  const previousReservations = scopeReservations(params.reservationsPrev, previousPeriod);
  const currentTransactions = scopeTransactions(params.transactions, activePeriod);
  const previousTransactions = scopeTransactions(params.transactions, previousPeriod);
  const revenueTrend = computeRevenueTrend({
    reservations: [...currentReservations, ...previousReservations],
    transactions: [...currentTransactions, ...previousTransactions],
    period: activePeriod,
    propertyFilter: params.propertyFilter,
  });
  const currentMonths = buildMonthBuckets(activePeriod);
  const previousMonths = buildMonthBuckets(previousPeriod);
  const occupancyTrend = computeOccupancyTrend({
    reservations: currentReservations,
    properties: scopedProperties,
    months: currentMonths,
  });
  const previousOccupancyTrend = computeOccupancyTrend({
    reservations: previousReservations,
    properties: scopedProperties,
    months: previousMonths,
  });
  const currentRevenue = sumReservationRevenue(currentReservations, activePeriod)
    + sumTransactionIncome(currentTransactions, activePeriod);
  const previousRevenue = sumReservationRevenue(previousReservations, previousPeriod)
    + sumTransactionIncome(previousTransactions, previousPeriod);

  return {
    revenueTrend,
    occupancyTrend,
    leadTimeDist: computeLeadTimeDist(currentReservations),
    sourceBreakdown: computeSourceBreakdown(currentReservations),
    revPAN: computeRevPAN({
      reservations: currentReservations,
      properties: scopedProperties,
      period: activePeriod,
    }),
    avgLengthOfStay: computeAvgLengthOfStay(currentReservations),
    avgLeadTimeDays: computeAvgLeadTime(currentReservations),
    kpi: {
      revenue: computeKpiDelta(currentRevenue, previousRevenue),
      occupancy: computeKpiDelta(
        averageOccupancyRate(occupancyTrend),
        averageOccupancyRate(previousOccupancyTrend),
      ),
      avgStay: computeKpiDelta(
        computeAvgLengthOfStay(currentReservations),
        computeAvgLengthOfStay(previousReservations),
      ),
      reservations: computeKpiDelta(
        countActiveReservations(currentReservations),
        countActiveReservations(previousReservations),
      ),
    },
  };
}

function escapeCsvValue(value: string | number | null): string {
  if (value == null) return '';
  const normalized = String(value);
  if (normalized.includes(';') || normalized.includes('"') || normalized.includes('\n') || normalized.includes('\r')) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function exportAnalyticsCsv(trend: MonthlyPoint[]): string {
  const rows = [
    ['Mois', 'Revenus', 'Dépenses', 'Net', 'Revenus N-1', 'Net N-1'],
    ...trend.map((point) => [
      point.month,
      point.revenue,
      point.expenses,
      point.net,
      point.prevYearRevenue,
      point.prevYearNet,
    ]),
  ];

  return rows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(';'))
    .join('\r\n');
}
