import type {
  PriceComputation,
  PricingOverride,
  PricingRule,
  PricingRuleCreateInput,
  PricingRuleType,
  PricingValidationErrorKey,
} from '../types/pricing';
import { PRICING_RULE_TYPES } from '../types/pricing';

type ReservationPricingEntry = {
  check_in_date: string;
  check_out_date: string;
  status: string;
  property_id: string;
};

interface ComputePriceForDateInput {
  propertyId: string;
  date: string;
  baseRate: number;
  currency: string;
  rules: PricingRule[];
  overrides: PricingOverride[];
  reservations?: ReservationPricingEntry[];
  today?: string;
}

interface ComputePriceRangeInput extends ComputePriceForDateInput {
  range: {
    start: string;
    end: string;
  };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const OCCUPANCY_WINDOW_DAYS = 30;
const OCCUPANCY_LOW_THRESHOLD = 0.4;
const OCCUPANCY_HIGH_THRESHOLD = 0.7;
const BOOKED_STATUSES_TO_SKIP = new Set(['cancelled']);

function parseYmd(date: string): Date {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date(Number.NaN);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

function dateToYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function diffInDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeCurrency(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  return normalized || 'EUR';
}

function stablePrioritySort(rules: PricingRule[]): PricingRule[] {
  return rules
    .map((rule, index) => ({ rule, index }))
    .sort((left, right) => {
      if (right.rule.priority !== left.rule.priority) {
        return right.rule.priority - left.rule.priority;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.rule);
}

function ruleMatchesScope(rule: PricingRule, propertyId: string): boolean {
  return rule.property_id === null || rule.property_id === propertyId;
}

function ruleMatchesLeadDays(rule: PricingRule, date: string, today?: string): boolean {
  if (!today || rule.lead_days_min == null || rule.lead_days_max == null) return false;

  const todayDate = parseYmd(today);
  const targetDate = parseYmd(date);
  if (Number.isNaN(todayDate.getTime()) || Number.isNaN(targetDate.getTime())) return false;

  const leadDays = diffInDays(todayDate, targetDate);
  return leadDays >= rule.lead_days_min && leadDays <= rule.lead_days_max;
}

function overlappingBookedNights(
  reservation: ReservationPricingEntry,
  windowStart: Date,
  windowEndExclusive: Date,
): number {
  if (BOOKED_STATUSES_TO_SKIP.has(reservation.status)) return 0;

  const reservationStart = parseYmd(reservation.check_in_date);
  const reservationEndExclusive = parseYmd(reservation.check_out_date);

  if (Number.isNaN(reservationStart.getTime()) || Number.isNaN(reservationEndExclusive.getTime())) {
    return 0;
  }

  const overlapStart = Math.max(reservationStart.getTime(), windowStart.getTime());
  const overlapEnd = Math.min(reservationEndExclusive.getTime(), windowEndExclusive.getTime());

  if (overlapEnd <= overlapStart) return 0;
  return Math.round((overlapEnd - overlapStart) / MS_PER_DAY);
}

function occupancyRateForDate(
  propertyId: string,
  date: string,
  reservations?: ReservationPricingEntry[],
): number | null {
  if (!reservations) return null;

  const targetDate = parseYmd(date);
  if (Number.isNaN(targetDate.getTime())) return null;

  // The rolling window is centered on the target date: 14 nights before and 15 after.
  const windowStart = addUtcDays(targetDate, -14);
  const windowEndExclusive = addUtcDays(windowStart, OCCUPANCY_WINDOW_DAYS);

  const bookedNights = reservations
    .filter((reservation) => reservation.property_id === propertyId)
    .reduce(
      (total, reservation) => total + overlappingBookedNights(reservation, windowStart, windowEndExclusive),
      0,
    );

  return bookedNights / OCCUPANCY_WINDOW_DAYS;
}

function ruleAppliesToDate(
  rule: PricingRule,
  propertyId: string,
  date: string,
  today?: string,
  reservations?: ReservationPricingEntry[],
): boolean {
  if (!rule.is_active || !ruleMatchesScope(rule, propertyId)) return false;

  const day = parseYmd(date).getUTCDay();

  switch (rule.rule_type) {
    case 'weekday':
      return Array.isArray(rule.weekdays) && rule.weekdays.includes(day);
    case 'weekend':
      return day === 0 || day === 6;
    case 'date_range':
      return Boolean(rule.start_date && rule.end_date && date >= rule.start_date && date <= rule.end_date);
    case 'last_minute':
    case 'far_future':
      return ruleMatchesLeadDays(rule, date, today);
    case 'occupancy_low': {
      const occupancy = occupancyRateForDate(propertyId, date, reservations);
      return occupancy != null && occupancy < OCCUPANCY_LOW_THRESHOLD;
    }
    case 'occupancy_high': {
      const occupancy = occupancyRateForDate(propertyId, date, reservations);
      return occupancy != null && occupancy > OCCUPANCY_HIGH_THRESHOLD;
    }
    case 'min_nights':
      return false;
    default:
      return false;
  }
}

export function applicableRulesFor(
  propertyId: string,
  rules: PricingRule[],
  date: string,
  today?: string,
  reservations?: ReservationPricingEntry[],
): PricingRule[] {
  return stablePrioritySort(
    rules.filter((rule) => ruleAppliesToDate(rule, propertyId, date, today, reservations)),
  );
}

export function computePriceForDate({
  propertyId,
  date,
  baseRate,
  currency,
  rules,
  overrides,
  reservations,
  today,
}: ComputePriceForDateInput): PriceComputation {
  const normalizedBaseRate = Number.isFinite(baseRate) ? baseRate : 0;
  const normalizedCurrency = normalizeCurrency(currency);
  const override = overrides.find(
    (entry) => entry.property_id === propertyId && entry.target_date === date,
  );

  if (override) {
    return {
      date,
      baseRate: normalizedBaseRate,
      appliedRules: [],
      appliedOverride: {
        id: override.id,
        rate: roundCurrency(override.nightly_rate),
      },
      finalRate: roundCurrency(override.nightly_rate),
      currency: normalizedCurrency,
    };
  }

  const applicableRules = applicableRulesFor(propertyId, rules, date, today, reservations);
  const multiplierProduct = applicableRules.reduce((product, rule) => product * rule.multiplier, 1);
  const flatAdjustmentTotal = applicableRules.reduce((total, rule) => total + rule.flat_adjustment, 0);

  return {
    date,
    baseRate: normalizedBaseRate,
    appliedRules: applicableRules.map((rule) => ({
      ruleId: rule.id,
      ruleName: rule.name,
      multiplier: rule.multiplier,
      flatAdjustment: rule.flat_adjustment,
    })),
    finalRate: roundCurrency(normalizedBaseRate * multiplierProduct + flatAdjustmentTotal),
    currency: normalizedCurrency,
  };
}

export function computePriceRange({
  range,
  ...input
}: ComputePriceRangeInput): PriceComputation[] {
  const startDate = parseYmd(range.start);
  const endDate = parseYmd(range.end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return [];
  if (startDate.getTime() > endDate.getTime()) return [];

  const computations: PriceComputation[] = [];
  const cursor = new Date(startDate.getTime());

  while (cursor.getTime() <= endDate.getTime()) {
    const date = dateToYmd(cursor);
    computations.push(computePriceForDate({ ...input, date }));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return computations;
}

export function validatePricingRule(
  rule: Pick<
    PricingRule | PricingRuleCreateInput,
    | 'rule_type'
    | 'multiplier'
    | 'weekdays'
    | 'start_date'
    | 'end_date'
    | 'lead_days_min'
    | 'lead_days_max'
    | 'min_nights_threshold'
  >,
): PricingValidationErrorKey | null {
  if (!Number.isFinite(rule.multiplier) || rule.multiplier <= 0) {
    return 'multiplierInvalid';
  }

  switch (rule.rule_type) {
    case 'weekday':
      return Array.isArray(rule.weekdays) && rule.weekdays.length > 0 ? null : 'missingWeekdays';
    case 'date_range':
      if (!rule.start_date || !rule.end_date) return 'missingDateRange';
      return rule.start_date <= rule.end_date ? null : 'dateRangeInvalid';
    case 'last_minute':
    case 'far_future':
      if (
        rule.lead_days_min == null
        || rule.lead_days_max == null
        || rule.lead_days_min < 0
        || rule.lead_days_max < 0
        || rule.lead_days_min > rule.lead_days_max
      ) {
        return 'leadDaysInvalid';
      }
      return null;
    case 'min_nights':
      return rule.min_nights_threshold != null && rule.min_nights_threshold > 0
        ? null
        : 'missingMinNights';
    default:
      return null;
  }
}

export function summarizeRules(rules: PricingRule[]): {
  total: number;
  active: number;
  byType: Record<PricingRuleType, number>;
} {
  const byType = PRICING_RULE_TYPES.reduce<Record<PricingRuleType, number>>((accumulator, type) => {
    accumulator[type] = 0;
    return accumulator;
  }, {} as Record<PricingRuleType, number>);

  rules.forEach((rule) => {
    byType[rule.rule_type] += 1;
  });

  return {
    total: rules.length,
    active: rules.filter((rule) => rule.is_active).length,
    byType,
  };
}
