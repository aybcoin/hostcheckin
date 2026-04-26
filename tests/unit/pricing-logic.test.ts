import { describe, expect, it } from 'vitest';
import {
  applicableRulesFor,
  computePriceForDate,
  computePriceRange,
  summarizeRules,
  validatePricingRule,
} from '../../src/lib/pricing-logic';
import type {
  PricingOverride,
  PricingRule,
  PricingRuleCreateInput,
  PricingRuleType,
} from '../../src/types/pricing';

function makeRule(overrides: Partial<PricingRule> = {}): PricingRule {
  return {
    id: 'rule-1',
    host_id: 'host-1',
    property_id: null,
    name: 'Rule',
    rule_type: 'weekend',
    priority: 0,
    is_active: true,
    multiplier: 1,
    flat_adjustment: 0,
    weekdays: [],
    start_date: null,
    end_date: null,
    min_nights_threshold: null,
    lead_days_min: null,
    lead_days_max: null,
    notes: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function makeOverride(overrides: Partial<PricingOverride> = {}): PricingOverride {
  return {
    id: 'override-1',
    host_id: 'host-1',
    property_id: 'prop-1',
    target_date: '2026-05-03',
    nightly_rate: 250,
    reason: 'Festival',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function makeReservation(overrides: Partial<{
  check_in_date: string;
  check_out_date: string;
  status: string;
  property_id: string;
}> = {}) {
  return {
    check_in_date: '2026-05-05',
    check_out_date: '2026-05-10',
    status: 'pending',
    property_id: 'prop-1',
    ...overrides,
  };
}

function makeInput(overrides: Partial<Parameters<typeof computePriceForDate>[0]> = {}) {
  return {
    propertyId: 'prop-1',
    date: '2026-05-03',
    baseRate: 100,
    currency: 'EUR',
    rules: [] as PricingRule[],
    overrides: [] as PricingOverride[],
    ...overrides,
  };
}

describe('computePriceForDate', () => {
  it('returns the base rate when no rules or overrides apply', () => {
    const result = computePriceForDate(makeInput());

    expect(result.finalRate).toBe(100);
    expect(result.appliedRules).toEqual([]);
    expect(result.appliedOverride).toBeUndefined();
  });

  it('short-circuits to an override when one exists for the date and property', () => {
    const result = computePriceForDate(makeInput({
      overrides: [makeOverride({ nightly_rate: 275.5 })],
      rules: [makeRule({ multiplier: 1.5 })],
    }));

    expect(result.finalRate).toBe(275.5);
    expect(result.appliedOverride).toEqual({ id: 'override-1', rate: 275.5 });
    expect(result.appliedRules).toEqual([]);
  });

  it('applies a weekday rule when the JS day matches the configured weekday', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-02',
      rules: [makeRule({ rule_type: 'weekday', weekdays: [6], multiplier: 1.2 })],
    }));

    expect(result.finalRate).toBe(120);
  });

  it('skips a weekday rule when the day is not listed', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-04',
      rules: [makeRule({ rule_type: 'weekday', weekdays: [6], multiplier: 1.2 })],
    }));

    expect(result.finalRate).toBe(100);
  });

  it('applies a weekend rule on Sunday', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-03',
      rules: [makeRule({ rule_type: 'weekend', multiplier: 1.1 })],
    }));

    expect(result.finalRate).toBe(110);
  });

  it('applies a weekend rule on Saturday', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-02',
      rules: [makeRule({ rule_type: 'weekend', multiplier: 1.15 })],
    }));

    expect(result.finalRate).toBe(115);
  });

  it('applies a date_range rule on the inclusive start boundary', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-01',
      rules: [makeRule({ rule_type: 'date_range', start_date: '2026-05-01', end_date: '2026-05-10', multiplier: 1.25 })],
    }));

    expect(result.finalRate).toBe(125);
  });

  it('applies a date_range rule on the inclusive end boundary', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-10',
      rules: [makeRule({ rule_type: 'date_range', start_date: '2026-05-01', end_date: '2026-05-10', multiplier: 1.25 })],
    }));

    expect(result.finalRate).toBe(125);
  });

  it('skips a date_range rule outside the configured boundaries', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-11',
      rules: [makeRule({ rule_type: 'date_range', start_date: '2026-05-01', end_date: '2026-05-10', multiplier: 1.25 })],
    }));

    expect(result.finalRate).toBe(100);
  });

  it('applies a last_minute rule when lead days are within range', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-05',
      today: '2026-05-01',
      rules: [makeRule({ rule_type: 'last_minute', lead_days_min: 0, lead_days_max: 7, multiplier: 0.9 })],
    }));

    expect(result.finalRate).toBe(90);
  });

  it('skips a last_minute rule when today is not provided', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-05',
      rules: [makeRule({ rule_type: 'last_minute', lead_days_min: 0, lead_days_max: 7, multiplier: 0.9 })],
    }));

    expect(result.finalRate).toBe(100);
  });

  it('applies a far_future rule when lead days are within range', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-06-10',
      today: '2026-05-01',
      rules: [makeRule({ rule_type: 'far_future', lead_days_min: 30, lead_days_max: 60, multiplier: 0.95 })],
    }));

    expect(result.finalRate).toBe(95);
  });

  it('skips a far_future rule when lead days are outside range', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-06-10',
      today: '2026-06-01',
      rules: [makeRule({ rule_type: 'far_future', lead_days_min: 30, lead_days_max: 60, multiplier: 0.95 })],
    }));

    expect(result.finalRate).toBe(100);
  });

  it('applies occupancy_low when booked nights stay below 40 percent', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-15',
      reservations: [makeReservation({ check_in_date: '2026-05-05', check_out_date: '2026-05-10' })],
      rules: [makeRule({ rule_type: 'occupancy_low', multiplier: 0.85 })],
    }));

    expect(result.finalRate).toBe(85);
  });

  it('does not apply occupancy_low at the 40 percent threshold', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-15',
      reservations: [makeReservation({ check_in_date: '2026-05-01', check_out_date: '2026-05-13' })],
      rules: [makeRule({ rule_type: 'occupancy_low', multiplier: 0.85 })],
    }));

    expect(result.finalRate).toBe(100);
  });

  it('applies occupancy_high when booked nights exceed 70 percent', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-15',
      reservations: [makeReservation({ check_in_date: '2026-05-01', check_out_date: '2026-05-23' })],
      rules: [makeRule({ rule_type: 'occupancy_high', multiplier: 1.25 })],
    }));

    expect(result.finalRate).toBe(125);
  });

  it('does not apply occupancy_high at the 70 percent threshold', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-15',
      reservations: [makeReservation({ check_in_date: '2026-05-01', check_out_date: '2026-05-22' })],
      rules: [makeRule({ rule_type: 'occupancy_high', multiplier: 1.25 })],
    }));

    expect(result.finalRate).toBe(100);
  });

  it('skips occupancy rules when reservations are not provided', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-15',
      rules: [makeRule({ rule_type: 'occupancy_high', multiplier: 1.25 })],
    }));

    expect(result.finalRate).toBe(100);
  });

  it('ignores reservations from another property for occupancy rules', () => {
    const result = computePriceForDate(makeInput({
      date: '2026-05-15',
      reservations: [makeReservation({ property_id: 'prop-2', check_in_date: '2026-05-01', check_out_date: '2026-05-23' })],
      rules: [makeRule({ rule_type: 'occupancy_high', multiplier: 1.25 })],
    }));

    expect(result.finalRate).toBe(100);
  });

  it('skips min_nights rules in date-level pricing', () => {
    const result = computePriceForDate(makeInput({
      rules: [makeRule({ rule_type: 'min_nights', multiplier: 1.4, min_nights_threshold: 5 })],
    }));

    expect(result.finalRate).toBe(100);
  });

  it('composes multiple multipliers multiplicatively', () => {
    const result = computePriceForDate(makeInput({
      rules: [
        makeRule({ id: 'rule-a', multiplier: 1.2 }),
        makeRule({ id: 'rule-b', multiplier: 0.9 }),
      ],
    }));

    expect(result.finalRate).toBe(108);
  });

  it('adds flat adjustments after multipliers are composed', () => {
    const result = computePriceForDate(makeInput({
      rules: [
        makeRule({ id: 'rule-a', multiplier: 1.2, flat_adjustment: 10 }),
        makeRule({ id: 'rule-b', multiplier: 1, flat_adjustment: -5 }),
      ],
    }));

    expect(result.finalRate).toBe(125);
  });

  it('orders applied rules by descending priority', () => {
    const result = computePriceForDate(makeInput({
      rules: [
        makeRule({ id: 'low', name: 'Low', priority: 1, multiplier: 1.1 }),
        makeRule({ id: 'high', name: 'High', priority: 10, multiplier: 1.2 }),
      ],
    }));

    expect(result.appliedRules.map((rule) => rule.ruleId)).toEqual(['high', 'low']);
  });

  it('excludes inactive rules', () => {
    const result = computePriceForDate(makeInput({
      rules: [
        makeRule({ is_active: false, multiplier: 2 }),
        makeRule({ id: 'active', multiplier: 1.1 }),
      ],
    }));

    expect(result.finalRate).toBe(110);
    expect(result.appliedRules).toHaveLength(1);
  });

  it('applies both global and property-scoped rules to the matching property', () => {
    const result = computePriceForDate(makeInput({
      rules: [
        makeRule({ id: 'global', multiplier: 1.1, property_id: null }),
        makeRule({ id: 'scoped', multiplier: 1.2, property_id: 'prop-1' }),
      ],
    }));

    expect(result.finalRate).toBe(132);
  });

  it('does not apply rules scoped to another property', () => {
    const result = computePriceForDate(makeInput({
      propertyId: 'prop-1',
      rules: [
        makeRule({ id: 'global', multiplier: 1.1, property_id: null }),
        makeRule({ id: 'other-property', multiplier: 1.2, property_id: 'prop-2' }),
      ],
    }));

    expect(result.finalRate).toBe(110);
  });

  it('keeps override precedence even when matching rules exist', () => {
    const result = computePriceForDate(makeInput({
      rules: [makeRule({ multiplier: 2 })],
      overrides: [makeOverride({ nightly_rate: 180 })],
    }));

    expect(result.finalRate).toBe(180);
    expect(result.appliedRules).toEqual([]);
  });

  it('rounds the final rate to two decimals', () => {
    const result = computePriceForDate(makeInput({
      baseRate: 99.99,
      rules: [makeRule({ multiplier: 1.155 })],
    }));

    expect(result.finalRate).toBe(115.49);
  });

  it('normalizes the output currency to uppercase', () => {
    const result = computePriceForDate(makeInput({ currency: 'eur' }));
    expect(result.currency).toBe('EUR');
  });
});

describe('computePriceRange', () => {
  it('computes each day in an inclusive range', () => {
    const result = computePriceRange({
      ...makeInput({
        rules: [makeRule({ rule_type: 'date_range', start_date: '2026-05-01', end_date: '2026-05-03', multiplier: 1.1 })],
      }),
      range: { start: '2026-05-01', end: '2026-05-03' },
    });

    expect(result.map((entry) => entry.date)).toEqual(['2026-05-01', '2026-05-02', '2026-05-03']);
    expect(result.map((entry) => entry.finalRate)).toEqual([110, 110, 110]);
  });

  it('returns an empty array when the range is inverted', () => {
    const result = computePriceRange({
      ...makeInput(),
      range: { start: '2026-05-03', end: '2026-05-01' },
    });

    expect(result).toEqual([]);
  });
});

describe('applicableRulesFor', () => {
  it('returns only active and matching rules sorted by priority', () => {
    const result = applicableRulesFor(
      'prop-1',
      [
        makeRule({ id: 'inactive', is_active: false, multiplier: 2 }),
        makeRule({ id: 'other-property', property_id: 'prop-2', multiplier: 1.2 }),
        makeRule({ id: 'high', priority: 10, multiplier: 1.15 }),
        makeRule({ id: 'low', priority: 1, multiplier: 1.05 }),
      ],
      '2026-05-03',
    );

    expect(result.map((rule) => rule.id)).toEqual(['high', 'low']);
  });
});

describe('validatePricingRule', () => {
  it('rejects non-positive multipliers', () => {
    const rule: PricingRuleCreateInput = {
      name: 'Invalid',
      rule_type: 'weekend',
      multiplier: 0,
    };

    expect(validatePricingRule(rule)).toBe('multiplierInvalid');
  });

  it('requires weekdays for weekday rules', () => {
    const rule: PricingRuleCreateInput = {
      name: 'Weekday',
      rule_type: 'weekday',
      multiplier: 1.1,
      weekdays: [],
    };

    expect(validatePricingRule(rule)).toBe('missingWeekdays');
  });

  it('requires both dates for date_range rules', () => {
    const rule: PricingRuleCreateInput = {
      name: 'Season',
      rule_type: 'date_range',
      multiplier: 1.1,
      start_date: '2026-05-01',
    };

    expect(validatePricingRule(rule)).toBe('missingDateRange');
  });

  it('rejects date_range rules when start is after end', () => {
    const rule: PricingRuleCreateInput = {
      name: 'Season',
      rule_type: 'date_range',
      multiplier: 1.1,
      start_date: '2026-05-10',
      end_date: '2026-05-01',
    };

    expect(validatePricingRule(rule)).toBe('dateRangeInvalid');
  });

  it('rejects lead-day rules when bounds are missing', () => {
    const rule: PricingRuleCreateInput = {
      name: 'Last minute',
      rule_type: 'last_minute',
      multiplier: 0.9,
      lead_days_min: 0,
    };

    expect(validatePricingRule(rule)).toBe('leadDaysInvalid');
  });

  it('rejects lead-day rules when bounds are negative', () => {
    const rule: PricingRuleCreateInput = {
      name: 'Last minute',
      rule_type: 'last_minute',
      multiplier: 0.9,
      lead_days_min: -1,
      lead_days_max: 7,
    };

    expect(validatePricingRule(rule)).toBe('leadDaysInvalid');
  });

  it('rejects lead-day rules when min exceeds max', () => {
    const rule: PricingRuleCreateInput = {
      name: 'Far future',
      rule_type: 'far_future',
      multiplier: 0.95,
      lead_days_min: 30,
      lead_days_max: 10,
    };

    expect(validatePricingRule(rule)).toBe('leadDaysInvalid');
  });

  it('requires a positive min nights threshold for min_nights rules', () => {
    const rule: PricingRuleCreateInput = {
      name: 'Long stay',
      rule_type: 'min_nights',
      multiplier: 0.95,
      min_nights_threshold: 0,
    };

    expect(validatePricingRule(rule)).toBe('missingMinNights');
  });

  it('accepts valid weekday rules', () => {
    const rule: PricingRuleCreateInput = {
      name: 'Weekday',
      rule_type: 'weekday',
      multiplier: 1.1,
      weekdays: [1, 2, 3],
    };

    expect(validatePricingRule(rule)).toBeNull();
  });

  it('accepts valid lead-day rules', () => {
    const rule: PricingRuleCreateInput = {
      name: 'Far future',
      rule_type: 'far_future',
      multiplier: 0.95,
      lead_days_min: 30,
      lead_days_max: 90,
    };

    expect(validatePricingRule(rule)).toBeNull();
  });
});

describe('summarizeRules', () => {
  it('counts total, active and per-type totals', () => {
    const rules = [
      makeRule({ rule_type: 'weekend', is_active: true }),
      makeRule({ id: 'rule-2', rule_type: 'weekday', is_active: false }),
      makeRule({ id: 'rule-3', rule_type: 'weekday', is_active: true }),
    ];

    const summary = summarizeRules(rules);

    expect(summary.total).toBe(3);
    expect(summary.active).toBe(2);
    expect(summary.byType.weekend).toBe(1);
    expect(summary.byType.weekday).toBe(2);
  });

  it('initializes every rule type to zero when the input is empty', () => {
    const summary = summarizeRules([]);

    const zeroTypes = Object.values(summary.byType).every((count) => count === 0);
    expect(summary.total).toBe(0);
    expect(summary.active).toBe(0);
    expect(zeroTypes).toBe(true);
  });

  it('tracks all supported pricing rule types', () => {
    const types: PricingRuleType[] = [
      'weekday',
      'weekend',
      'date_range',
      'occupancy_low',
      'occupancy_high',
      'last_minute',
      'far_future',
      'min_nights',
    ];

    const summary = summarizeRules(
      types.map((type, index) =>
        makeRule({ id: `rule-${index}`, rule_type: type }),
      ),
    );

    expect(summary.byType).toEqual({
      weekday: 1,
      weekend: 1,
      date_range: 1,
      occupancy_low: 1,
      occupancy_high: 1,
      last_minute: 1,
      far_future: 1,
      min_nights: 1,
    });
  });
});
