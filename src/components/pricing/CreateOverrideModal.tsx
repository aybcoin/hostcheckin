import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  iconButtonToken,
  inputTokens,
  modalTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { PricingOverrideCreateInput, PricingOverrideWithRelations } from '../../types/pricing';
import { Button } from '../ui/Button';

interface PropertyOption {
  id: string;
  name: string;
}

interface CreateOverrideModalProps {
  isOpen: boolean;
  properties: PropertyOption[];
  overrides: PricingOverrideWithRelations[];
  initialPropertyId?: string | null;
  initialTargetDate?: string | null;
  onClose: () => void;
  onSubmit: (input: PricingOverrideCreateInput) => Promise<{ error: Error | null } | void>;
}

function parseRate(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function CreateOverrideModal({
  isOpen,
  properties,
  overrides,
  initialPropertyId,
  initialTargetDate,
  onClose,
  onSubmit,
}: CreateOverrideModalProps) {
  const [propertyId, setPropertyId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [nightlyRate, setNightlyRate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPropertyId(initialPropertyId ?? '');
    setTargetDate(initialTargetDate ?? '');
    setNightlyRate('');
    setReason('');
    setError(null);
    setSubmitting(false);
  }, [initialPropertyId, initialTargetDate, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const existingOverride = useMemo(
    () =>
      overrides.find(
        (override) => override.property_id === propertyId && override.target_date === targetDate,
      ) ?? null,
    [overrides, propertyId, targetDate],
  );

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!propertyId) {
      setError(fr.pricingEngine.override.missingProperty);
      return;
    }
    if (!targetDate) {
      setError(fr.pricingEngine.override.missingDate);
      return;
    }
    if (existingOverride) {
      setError(fr.pricingEngine.override.existingConflict);
      return;
    }

    const parsedRate = parseRate(nightlyRate);
    if (parsedRate == null) {
      setError(fr.pricingEngine.override.invalidRate);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({
        property_id: propertyId,
        target_date: targetDate,
        nightly_rate: parsedRate,
        reason: reason.trim() || null,
      });

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
      aria-labelledby="create-pricing-override-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className={clsx(modalTokens.panel, 'max-w-xl')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="create-pricing-override-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.pricingEngine.override.title}
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
          <div className="space-y-1.5">
            <label htmlFor="pricing-override-property" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.pricingEngine.override.property}
            </label>
            <select
              id="pricing-override-property"
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              className={inputTokens.base}
            >
              <option value="">{fr.pricingEngine.filters.propertyAll}</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="pricing-override-date" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.pricingEngine.override.targetDate}
              </label>
              <input
                id="pricing-override-date"
                type="date"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className={inputTokens.base}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="pricing-override-rate" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.pricingEngine.override.nightlyRate}
              </label>
              <input
                id="pricing-override-rate"
                type="number"
                min={0}
                step="0.01"
                value={nightlyRate}
                onChange={(event) => setNightlyRate(event.target.value)}
                className={inputTokens.base}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pricing-override-reason" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.pricingEngine.override.reason}
            </label>
            <textarea
              id="pricing-override-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={fr.pricingEngine.override.reasonPlaceholder}
              className={clsx(inputTokens.base, 'min-h-24 resize-y')}
            />
          </div>

          {existingOverride ? (
            <div className={clsx('rounded-lg border px-4 py-3 text-sm', statusTokens.warning)}>
              {fr.pricingEngine.override.existingConflict}
            </div>
          ) : null}

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
          <Button type="submit" variant="primary" disabled={submitting || Boolean(existingOverride)}>
            {fr.pricingEngine.override.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
