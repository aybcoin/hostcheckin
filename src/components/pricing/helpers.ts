import type { LucideIcon } from 'lucide-react';
import {
  BedDouble,
  CalendarDays,
  CalendarRange,
  Clock3,
  Moon,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { fr } from '../../lib/i18n/fr';
import type { PricingRule, PricingRuleType } from '../../types/pricing';

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const PRICING_WEEKDAY_OPTIONS = [
  { value: 1, label: fr.pricingEngine.create.weekdays.monday },
  { value: 2, label: fr.pricingEngine.create.weekdays.tuesday },
  { value: 3, label: fr.pricingEngine.create.weekdays.wednesday },
  { value: 4, label: fr.pricingEngine.create.weekdays.thursday },
  { value: 5, label: fr.pricingEngine.create.weekdays.friday },
  { value: 6, label: fr.pricingEngine.create.weekdays.saturday },
  { value: 0, label: fr.pricingEngine.create.weekdays.sunday },
] as const;

const WEEKDAY_LABELS = new Map(PRICING_WEEKDAY_OPTIONS.map((item) => [item.value, item.label]));

export function formatPricingAmount(amount: number | null | undefined, currency: string = 'EUR'): string {
  if (amount == null || !Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPricingDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatPricingMonth(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatMultiplier(multiplier: number): string {
  return `x${multiplier.toFixed(2)}`;
}

export function formatSignedAdjustment(amount: number, currency: string = 'EUR'): string {
  const absolute = formatPricingAmount(Math.abs(amount), currency);
  if (amount > 0) return `+${absolute}`;
  if (amount < 0) return `-${absolute}`;
  return absolute;
}

export function formatWeekdayList(days: number[]): string {
  return WEEKDAY_ORDER
    .filter((day) => days.includes(day))
    .map((day) => WEEKDAY_LABELS.get(day) ?? String(day))
    .join(', ');
}

export function pricingRuleIcon(ruleType: PricingRuleType): LucideIcon {
  switch (ruleType) {
    case 'weekday':
      return CalendarDays;
    case 'weekend':
      return Moon;
    case 'date_range':
      return CalendarRange;
    case 'occupancy_low':
      return TrendingDown;
    case 'occupancy_high':
      return TrendingUp;
    case 'last_minute':
      return Clock3;
    case 'far_future':
      return CalendarDays;
    case 'min_nights':
      return BedDouble;
    default:
      return CalendarDays;
  }
}

export function summarizePricingRule(rule: PricingRule, currency: string = 'EUR'): string {
  const suffix =
    rule.flat_adjustment !== 0
      ? ` | ${formatSignedAdjustment(rule.flat_adjustment, currency)}`
      : '';

  switch (rule.rule_type) {
    case 'weekday':
      return `${formatWeekdayList(rule.weekdays)} | ${formatMultiplier(rule.multiplier)}${suffix}`;
    case 'weekend':
      return `${fr.pricingEngine.ruleType.weekend} | ${formatMultiplier(rule.multiplier)}${suffix}`;
    case 'date_range':
      return `${formatPricingDate(rule.start_date || '')} -> ${formatPricingDate(rule.end_date || '')} | ${formatMultiplier(rule.multiplier)}${suffix}`;
    case 'last_minute':
    case 'far_future':
      return `${rule.lead_days_min ?? 0}-${rule.lead_days_max ?? 0} j | ${formatMultiplier(rule.multiplier)}${suffix}`;
    case 'occupancy_low':
      return `< 40 % | ${formatMultiplier(rule.multiplier)}${suffix}`;
    case 'occupancy_high':
      return `> 70 % | ${formatMultiplier(rule.multiplier)}${suffix}`;
    case 'min_nights':
      return `>= ${rule.min_nights_threshold ?? 0} nuits${suffix}`;
    default:
      return formatMultiplier(rule.multiplier);
  }
}
