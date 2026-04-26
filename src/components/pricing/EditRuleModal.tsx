import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  iconButtonToken,
  modalTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { validatePricingRule } from '../../lib/pricing-logic';
import { fr } from '../../lib/i18n/fr';
import type { PricingRuleCreateInput, PricingRuleWithRelations, PricingValidationErrorKey } from '../../types/pricing';
import { Button } from '../ui/Button';
import { RuleForm, type PricingRuleFormValues } from './RuleForm';

interface PropertyOption {
  id: string;
  name: string;
}

interface EditRuleModalProps {
  isOpen: boolean;
  rule: PricingRuleWithRelations | null;
  onClose: () => void;
  onSubmit: (
    id: string,
    input: PricingRuleCreateInput,
  ) => Promise<{ error: Error | null } | void>;
  properties: PropertyOption[];
}

function parseNumber(value: string, fallback: number = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIntegerOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

function valuesFromRule(rule: PricingRuleWithRelations | null): PricingRuleFormValues {
  if (!rule) {
    return {
      name: '',
      rule_type: 'weekday',
      property_id: null,
      multiplier: '1',
      flat_adjustment: '0',
      priority: '0',
      weekdays: [],
      start_date: '',
      end_date: '',
      lead_days_min: '',
      lead_days_max: '',
      min_nights_threshold: '',
      notes: '',
    };
  }

  return {
    name: rule.name,
    rule_type: rule.rule_type,
    property_id: rule.property_id,
    multiplier: String(rule.multiplier),
    flat_adjustment: String(rule.flat_adjustment),
    priority: String(rule.priority),
    weekdays: rule.weekdays,
    start_date: rule.start_date ?? '',
    end_date: rule.end_date ?? '',
    lead_days_min: rule.lead_days_min == null ? '' : String(rule.lead_days_min),
    lead_days_max: rule.lead_days_max == null ? '' : String(rule.lead_days_max),
    min_nights_threshold: rule.min_nights_threshold == null ? '' : String(rule.min_nights_threshold),
    notes: rule.notes ?? '',
  };
}

function buildPayload(values: PricingRuleFormValues): PricingRuleCreateInput {
  return {
    name: values.name.trim(),
    rule_type: values.rule_type,
    property_id: values.property_id,
    multiplier: parseNumber(values.multiplier, Number.NaN),
    flat_adjustment: parseNumber(values.flat_adjustment, 0),
    priority: parseNumber(values.priority, 0),
    weekdays: values.weekdays,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
    lead_days_min: parseIntegerOrNull(values.lead_days_min),
    lead_days_max: parseIntegerOrNull(values.lead_days_max),
    min_nights_threshold: parseIntegerOrNull(values.min_nights_threshold),
    notes: values.notes.trim() || null,
  };
}

export function EditRuleModal({
  isOpen,
  rule,
  onClose,
  onSubmit,
  properties,
}: EditRuleModalProps) {
  const [values, setValues] = useState<PricingRuleFormValues>(() => valuesFromRule(rule));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setValues(valuesFromRule(rule));
    setError(null);
    setSubmitting(false);
  }, [isOpen, rule]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const validationErrorKey = useMemo<PricingValidationErrorKey | null>(
    () => validatePricingRule(buildPayload(values)),
    [values],
  );

  if (!isOpen || !rule) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const payload = buildPayload(values);
    const validationError = validatePricingRule(payload);
    if (validationError) {
      setError(fr.pricingEngine.validation[validationError]);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit(rule.id, payload);
      if (result && 'error' in result && result.error) {
        setError(fr.pricingEngine.updateError);
        setSubmitting(false);
        return;
      }
      onClose();
    } catch {
      setError(fr.pricingEngine.updateError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-pricing-rule-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className={clsx(modalTokens.panel, 'max-w-3xl')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="edit-pricing-rule-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.pricingEngine.edit.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={fr.common.close}
            className={iconButtonToken}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
          <RuleForm
            values={values}
            properties={properties}
            validationErrorKey={validationErrorKey}
            idPrefix="pricing-rule-edit"
            onChange={(patch) => setValues((previous) => ({ ...previous, ...patch }))}
          />

          {error ? (
            <div className={clsx('rounded-lg border px-4 py-3 text-sm', statusTokens.danger)}>
              {error}
            </div>
          ) : null}
        </div>

        <div className={clsx('flex items-center justify-end gap-2 border-t px-5 py-4', borderTokens.default)}>
          <Button type="button" variant="secondary" onClick={onClose}>
            {fr.common.cancel}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {fr.pricingEngine.edit.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
