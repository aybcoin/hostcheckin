import { type FormEvent, useEffect, useState } from 'react';
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
import {
  LINEN_TYPES,
  type LinenItemCreateInput,
  type LinenType,
} from '../../types/linen';
import { Button } from '../ui/Button';

interface CreateLinenItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: LinenItemCreateInput) => Promise<{ error: Error | null } | void>;
  properties: Property[];
  initialPropertyId?: string | null;
}

function parseNonNegativeInt(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

export function CreateLinenItemModal({
  isOpen,
  onClose,
  onSubmit,
  properties,
  initialPropertyId,
}: CreateLinenItemModalProps) {
  const [propertyId, setPropertyId] = useState('');
  const [linenType, setLinenType] = useState<LinenType | ''>('');
  const [size, setSize] = useState('');
  const [quantityTotal, setQuantityTotal] = useState('0');
  const [quantityClean, setQuantityClean] = useState('0');
  const [minThreshold, setMinThreshold] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPropertyId(initialPropertyId ?? properties[0]?.id ?? '');
    setLinenType('');
    setSize('');
    setQuantityTotal('0');
    setQuantityClean('0');
    setMinThreshold('0');
    setNotes('');
    setError(null);
    setSubmitting(false);
  }, [isOpen, initialPropertyId, properties]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!propertyId) {
      setError(fr.linen.create.missingProperty);
      return;
    }

    if (!linenType) {
      setError(fr.linen.create.missingType);
      return;
    }

    const parsedTotal = parseNonNegativeInt(quantityTotal);
    const parsedClean = parseNonNegativeInt(quantityClean);
    const parsedThreshold = parseNonNegativeInt(minThreshold);

    if (parsedClean > parsedTotal) {
      setError(fr.linen.create.invalidClean);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({
        property_id: propertyId,
        linen_type: linenType,
        size: size.trim() || null,
        quantity_total: parsedTotal,
        quantity_clean: parsedClean,
        quantity_dirty: 0,
        quantity_in_laundry: 0,
        min_threshold: parsedThreshold,
        notes: notes.trim() || null,
      });

      if (result && 'error' in result && result.error) {
        setError(fr.linen.create.createError);
        setSubmitting(false);
        return;
      }

      onClose();
    } catch {
      setError(fr.linen.create.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-linen-item-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className={clsx(modalTokens.panel, 'max-w-lg')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="create-linen-item-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.linen.create.title}
          </h2>
          <button
            type="button"
            aria-label={fr.linen.create.cancel}
            onClick={onClose}
            className={iconButtonToken}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <label htmlFor="linen-property" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.linen.create.property}
            </label>
            <select
              id="linen-property"
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              className={inputTokens.base}
              required
            >
              <option value="" disabled>
                {fr.linen.create.property}
              </option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="linen-type" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.linen.create.linen_type}
            </label>
            <select
              id="linen-type"
              value={linenType}
              onChange={(event) => setLinenType(event.target.value as LinenType | '')}
              className={inputTokens.base}
              required
            >
              <option value="" disabled>
                {fr.linen.create.linen_type}
              </option>
              {LINEN_TYPES.map((value) => (
                <option key={value} value={value}>
                  {fr.linen.linenType[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="linen-size" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.linen.create.size}
            </label>
            <input
              id="linen-size"
              type="text"
              value={size}
              onChange={(event) => setSize(event.target.value)}
              placeholder={fr.linen.create.sizePlaceholder}
              className={inputTokens.base}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="linen-quantity-total" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.linen.create.quantityTotal}
              </label>
              <input
                id="linen-quantity-total"
                type="number"
                min={0}
                step={1}
                value={quantityTotal}
                onChange={(event) => setQuantityTotal(event.target.value)}
                className={inputTokens.base}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="linen-quantity-clean" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.linen.create.quantityClean}
              </label>
              <input
                id="linen-quantity-clean"
                type="number"
                min={0}
                step={1}
                value={quantityClean}
                onChange={(event) => setQuantityClean(event.target.value)}
                className={inputTokens.base}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="linen-threshold" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.linen.create.minThreshold}
              </label>
              <input
                id="linen-threshold"
                type="number"
                min={0}
                step={1}
                value={minThreshold}
                onChange={(event) => setMinThreshold(event.target.value)}
                className={inputTokens.base}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="linen-notes" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.linen.create.notes}
            </label>
            <textarea
              id="linen-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={fr.linen.create.notesPlaceholder}
              className={clsx(inputTokens.base, 'resize-none')}
            />
          </div>

          {error ? (
            <p className={clsx('rounded-lg border px-3 py-2 text-sm', statusTokens.danger)}>{error}</p>
          ) : null}
        </div>

        <div className={clsx('flex items-center justify-end gap-2 border-t px-5 py-3', borderTokens.default)}>
          <Button type="button" variant="tertiary" size="sm" onClick={onClose} disabled={submitting}>
            {fr.linen.create.cancel}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={submitting}>
            {fr.linen.create.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
