import { clsx } from '../../lib/clsx';
import {
  inputTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { PricingRuleType, PricingValidationErrorKey } from '../../types/pricing';
import { PRICING_RULE_TYPES } from '../../types/pricing';
import { PRICING_WEEKDAY_OPTIONS } from './helpers';

interface PropertyOption {
  id: string;
  name: string;
}

export interface PricingRuleFormValues {
  name: string;
  rule_type: PricingRuleType;
  property_id: string | null;
  multiplier: string;
  flat_adjustment: string;
  priority: string;
  weekdays: number[];
  start_date: string;
  end_date: string;
  lead_days_min: string;
  lead_days_max: string;
  min_nights_threshold: string;
  notes: string;
}

interface RuleFormProps {
  values: PricingRuleFormValues;
  properties: PropertyOption[];
  validationErrorKey: PricingValidationErrorKey | null;
  idPrefix: string;
  onChange: (patch: Partial<PricingRuleFormValues>) => void;
}

const ALL_PROPERTIES_VALUE = '__all__';

function checkboxId(prefix: string, day: number): string {
  return `${prefix}-weekday-${day}`;
}

export function RuleForm({
  values,
  properties,
  validationErrorKey,
  idPrefix,
  onChange,
}: RuleFormProps) {
  const toggleWeekday = (day: number) => {
    const exists = values.weekdays.includes(day);
    const weekdays = exists
      ? values.weekdays.filter((value) => value !== day)
      : [...values.weekdays, day];
    onChange({ weekdays });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor={`${idPrefix}-name`} className={clsx('text-sm font-medium', textTokens.title)}>
            {fr.pricingEngine.create.name}
          </label>
          <input
            id={`${idPrefix}-name`}
            type="text"
            value={values.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder={fr.pricingEngine.create.namePlaceholder}
            className={inputTokens.base}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-rule-type`} className={clsx('text-sm font-medium', textTokens.title)}>
            {fr.pricingEngine.create.ruleType}
          </label>
          <select
            id={`${idPrefix}-rule-type`}
            value={values.rule_type}
            onChange={(event) => onChange({ rule_type: event.target.value as PricingRuleType })}
            className={inputTokens.base}
          >
            {PRICING_RULE_TYPES.map((type) => (
              <option key={type} value={type}>
                {fr.pricingEngine.ruleType[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-property`} className={clsx('text-sm font-medium', textTokens.title)}>
            {fr.pricingEngine.create.property}
          </label>
          <select
            id={`${idPrefix}-property`}
            value={values.property_id ?? ALL_PROPERTIES_VALUE}
            onChange={(event) =>
              onChange({
                property_id: event.target.value === ALL_PROPERTIES_VALUE ? null : event.target.value,
              })}
            className={inputTokens.base}
          >
            <option value={ALL_PROPERTIES_VALUE}>{fr.pricingEngine.create.propertyAll}</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-multiplier`} className={clsx('text-sm font-medium', textTokens.title)}>
            {fr.pricingEngine.create.multiplier}
          </label>
          <input
            id={`${idPrefix}-multiplier`}
            type="number"
            min={0}
            max={10}
            step="0.001"
            value={values.multiplier}
            onChange={(event) => onChange({ multiplier: event.target.value })}
            className={inputTokens.base}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-flat-adjustment`} className={clsx('text-sm font-medium', textTokens.title)}>
            {fr.pricingEngine.create.flatAdjustment}
          </label>
          <input
            id={`${idPrefix}-flat-adjustment`}
            type="number"
            step="0.01"
            value={values.flat_adjustment}
            onChange={(event) => onChange({ flat_adjustment: event.target.value })}
            className={inputTokens.base}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-priority`} className={clsx('text-sm font-medium', textTokens.title)}>
            {fr.pricingEngine.create.priority}
          </label>
          <input
            id={`${idPrefix}-priority`}
            type="number"
            step="1"
            value={values.priority}
            onChange={(event) => onChange({ priority: event.target.value })}
            className={inputTokens.base}
          />
        </div>
      </div>

      {values.rule_type === 'weekday' ? (
        <div className="space-y-2">
          <p className={clsx('text-sm font-medium', textTokens.title)}>{fr.pricingEngine.create.weekdays.label}</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {PRICING_WEEKDAY_OPTIONS.map((day) => {
              const checked = values.weekdays.includes(day.value);
              return (
                <label
                  key={day.value}
                  htmlFor={checkboxId(idPrefix, day.value)}
                  className={clsx('flex items-center gap-2 rounded-lg border px-3 py-2 text-sm', checked ? statusTokens.info : statusTokens.neutral)}
                >
                  <input
                    id={checkboxId(idPrefix, day.value)}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleWeekday(day.value)}
                  />
                  <span>{day.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {values.rule_type === 'date_range' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={`${idPrefix}-start-date`} className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.pricingEngine.create.startDate}
            </label>
            <input
              id={`${idPrefix}-start-date`}
              type="date"
              value={values.start_date}
              onChange={(event) => onChange({ start_date: event.target.value })}
              className={inputTokens.base}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${idPrefix}-end-date`} className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.pricingEngine.create.endDate}
            </label>
            <input
              id={`${idPrefix}-end-date`}
              type="date"
              value={values.end_date}
              onChange={(event) => onChange({ end_date: event.target.value })}
              className={inputTokens.base}
            />
          </div>
        </div>
      ) : null}

      {values.rule_type === 'last_minute' || values.rule_type === 'far_future' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={`${idPrefix}-lead-days-min`} className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.pricingEngine.create.leadDaysMin}
            </label>
            <input
              id={`${idPrefix}-lead-days-min`}
              type="number"
              min={0}
              step="1"
              value={values.lead_days_min}
              onChange={(event) => onChange({ lead_days_min: event.target.value })}
              className={inputTokens.base}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${idPrefix}-lead-days-max`} className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.pricingEngine.create.leadDaysMax}
            </label>
            <input
              id={`${idPrefix}-lead-days-max`}
              type="number"
              min={0}
              step="1"
              value={values.lead_days_max}
              onChange={(event) => onChange({ lead_days_max: event.target.value })}
              className={inputTokens.base}
            />
          </div>
        </div>
      ) : null}

      {values.rule_type === 'min_nights' ? (
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-min-nights`} className={clsx('text-sm font-medium', textTokens.title)}>
            {fr.pricingEngine.create.minNightsThreshold}
          </label>
          <input
            id={`${idPrefix}-min-nights`}
            type="number"
            min={1}
            step="1"
            value={values.min_nights_threshold}
            onChange={(event) => onChange({ min_nights_threshold: event.target.value })}
            className={inputTokens.base}
          />
        </div>
      ) : null}

      {values.rule_type === 'weekend' ? (
        <p className={clsx('text-sm', textTokens.muted)}>{fr.pricingEngine.create.weekendHint}</p>
      ) : null}

      {values.rule_type === 'occupancy_low' ? (
        <p className={clsx('text-sm', textTokens.muted)}>{fr.pricingEngine.create.occupancyLowHint}</p>
      ) : null}

      {values.rule_type === 'occupancy_high' ? (
        <p className={clsx('text-sm', textTokens.muted)}>{fr.pricingEngine.create.occupancyHighHint}</p>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-notes`} className={clsx('text-sm font-medium', textTokens.title)}>
          {fr.pricingEngine.create.notes}
        </label>
        <textarea
          id={`${idPrefix}-notes`}
          value={values.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder={fr.pricingEngine.create.notesPlaceholder}
          className={clsx(inputTokens.base, 'min-h-28 resize-y')}
        />
      </div>

      {validationErrorKey ? (
        <div className={clsx('rounded-lg border px-4 py-3 text-sm', statusTokens.danger)}>
          {fr.pricingEngine.validation[validationErrorKey]}
        </div>
      ) : null}
    </div>
  );
}
