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
import type { PricingRuleCreateInput, PricingValidationErrorKey } from '../../types/pricing';
import { Button } from '../ui/Button';
import { RuleForm, type PricingRuleFormValues } from './RuleForm';

interface PropertyOption {
  id: string;
  name: string;
}

interface CreateRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: PricingRuleCreateInput) => Promise<{ error: Error | null } | void>;
  properties: PropertyOption[];
}

function defaultValues(): PricingRuleFormValues {
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
    is_active: true,
  };
}

export function CreateRuleModal({
  isOpen,
  onClose,
  onSubmit,
  properties,
}: CreateRuleModalProps) {
  const [values, setValues] = useState<PricingRuleFormValues>(defaultValues);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setValues(defaultValues());
    setError(null);
    setSubmitting(false);
  }, [isOpen]);

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

  if (!isOpen) return null;

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
      const result = await onSubmit(payload);
      if (result && 'error' in result && result.error) {
        setError(fr.pricingEngine.createError);
        setSubmitting(false);
        return;
      }
      onClose();
    } catch {
      setError(fr.pricingEngine.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-pricing-rule-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className={clsx(modalTokens.panel, 'max-w-3xl')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="create-pricing-rule-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.pricingEngine.create.title}
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
            idPrefix="pricing-rule-create"
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
            {fr.pricingEngine.create.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
