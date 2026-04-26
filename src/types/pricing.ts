export type PricingRuleType =
  | 'weekday'
  | 'weekend'
  | 'date_range'
  | 'occupancy_low'
  | 'occupancy_high'
  | 'last_minute'
  | 'far_future'
  | 'min_nights';

export const PRICING_RULE_TYPES = [
  'weekday',
  'weekend',
  'date_range',
  'occupancy_low',
  'occupancy_high',
  'last_minute',
  'far_future',
  'min_nights',
] as const satisfies readonly PricingRuleType[];

export interface PricingRule {
  id: string;
  host_id: string;
  property_id: string | null;
  name: string;
  rule_type: PricingRuleType;
  priority: number;
  is_active: boolean;
  multiplier: number;
  flat_adjustment: number;
  weekdays: number[];
  start_date: string | null;
  end_date: string | null;
  min_nights_threshold: number | null;
  lead_days_min: number | null;
  lead_days_max: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PricingRuleWithRelations extends PricingRule {
  property_name?: string;
}

export interface PricingOverride {
  id: string;
  host_id: string;
  property_id: string;
  target_date: string;
  nightly_rate: number;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PricingOverrideWithRelations extends PricingOverride {
  property_name?: string;
}

export interface PricingRuleCreateInput {
  property_id?: string | null;
  name: string;
  rule_type: PricingRuleType;
  priority?: number;
  is_active?: boolean;
  multiplier: number;
  flat_adjustment?: number;
  weekdays?: number[];
  start_date?: string | null;
  end_date?: string | null;
  min_nights_threshold?: number | null;
  lead_days_min?: number | null;
  lead_days_max?: number | null;
  notes?: string | null;
}

export interface PricingOverrideCreateInput {
  property_id: string;
  target_date: string;
  nightly_rate: number;
  reason?: string | null;
}

export interface PriceComputation {
  date: string;
  baseRate: number;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    multiplier: number;
    flatAdjustment: number;
  }>;
  appliedOverride?: {
    id: string;
    rate: number;
  };
  finalRate: number;
  currency: string;
}

export type PricingValidationErrorKey =
  | 'multiplierInvalid'
  | 'missingWeekdays'
  | 'missingDateRange'
  | 'dateRangeInvalid'
  | 'leadDaysInvalid'
  | 'missingMinNights';
