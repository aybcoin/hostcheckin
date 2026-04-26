import { useEffect, useMemo, useState } from 'react';
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
import type { Property } from '../../lib/supabase';
import { Button } from '../ui/Button';

type BaseRateProperty = Pick<Property, 'id' | 'name' | 'base_nightly_rate' | 'pricing_currency'>;

interface BaseRateModalProps {
  isOpen: boolean;
  properties: BaseRateProperty[];
  onClose: () => void;
  onSave: (
    propertyId: string,
    rate: number | null,
    currency?: string,
  ) => Promise<{ error: Error | null } | void>;
}

type DraftState = Record<string, { rate: string; currency: string }>;

function createDrafts(properties: BaseRateProperty[]): DraftState {
  return properties.reduce<DraftState>((accumulator, property) => {
    accumulator[property.id] = {
      rate: property.base_nightly_rate == null ? '' : String(property.base_nightly_rate),
      currency: property.pricing_currency ?? 'EUR',
    };
    return accumulator;
  }, {});
}

function parseRate(value: string): number | null | typeof Number.NaN {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return Number.NaN;
  return parsed;
}

export function BaseRateModal({
  isOpen,
  properties,
  onClose,
  onSave,
}: BaseRateModalProps) {
  const [drafts, setDrafts] = useState<DraftState>(() => createDrafts(properties));
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [errorById, setErrorById] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!isOpen) return;
    setDrafts(createDrafts(properties));
    setSavingById({});
    setErrorById({});
  }, [isOpen, properties]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const sortedProperties = useMemo(
    () => properties.slice().sort((left, right) => left.name.localeCompare(right.name, 'fr')),
    [properties],
  );

  if (!isOpen) return null;

  const handleSave = async (propertyId: string) => {
    const draft = drafts[propertyId];
    if (!draft) return;

    const parsedRate = parseRate(draft.rate);
    if (Number.isNaN(parsedRate)) {
      setErrorById((previous) => ({
        ...previous,
        [propertyId]: fr.pricingEngine.baseRate.error,
      }));
      return;
    }

    setSavingById((previous) => ({ ...previous, [propertyId]: true }));
    setErrorById((previous) => ({ ...previous, [propertyId]: null }));

    try {
      const result = await onSave(propertyId, parsedRate, draft.currency);
      if (result && 'error' in result && result.error) {
        setErrorById((previous) => ({
          ...previous,
          [propertyId]: fr.pricingEngine.baseRate.error,
        }));
      }
    } catch {
      setErrorById((previous) => ({
        ...previous,
        [propertyId]: fr.pricingEngine.baseRate.error,
      }));
    } finally {
      setSavingById((previous) => ({ ...previous, [propertyId]: false }));
    }
  };

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-base-rates-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={clsx(modalTokens.panel, 'max-w-3xl')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="pricing-base-rates-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.pricingEngine.baseRate.title}
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

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-5">
          {sortedProperties.map((property) => {
            const draft = drafts[property.id] ?? { rate: '', currency: 'EUR' };
            const rowError = errorById[property.id];
            const saving = Boolean(savingById[property.id]);

            return (
              <div key={property.id} className={clsx('space-y-3 rounded-xl border p-4', borderTokens.default)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className={clsx('font-medium', textTokens.title)}>{property.name}</p>
                    <p className={clsx('text-sm', textTokens.muted)}>
                      {property.base_nightly_rate == null
                        ? fr.pricingEngine.baseRate.unset
                        : String(property.base_nightly_rate)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_auto]">
                  <div className="space-y-1.5">
                    <label htmlFor={`base-rate-${property.id}`} className={clsx('text-sm font-medium', textTokens.title)}>
                      {fr.pricingEngine.baseRate.nightlyRate}
                    </label>
                    <input
                      id={`base-rate-${property.id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={draft.rate}
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [property.id]: {
                            ...draft,
                            rate: event.target.value,
                          },
                        }))}
                      className={inputTokens.base}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor={`base-currency-${property.id}`} className={clsx('text-sm font-medium', textTokens.title)}>
                      {fr.pricingEngine.baseRate.currency}
                    </label>
                    <input
                      id={`base-currency-${property.id}`}
                      type="text"
                      maxLength={3}
                      value={draft.currency}
                      onChange={(event) =>
                        setDrafts((previous) => ({
                          ...previous,
                          [property.id]: {
                            ...draft,
                            currency: event.target.value,
                          },
                        }))}
                      className={inputTokens.base}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="primary"
                      onClick={() => {
                        void handleSave(property.id);
                      }}
                      disabled={saving}
                      className="w-full sm:w-auto"
                    >
                      {fr.pricingEngine.baseRate.save}
                    </Button>
                  </div>
                </div>

                {rowError ? (
                  <div className={clsx('rounded-lg border px-4 py-3 text-sm', statusTokens.danger)}>
                    {rowError}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
