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
  INVENTORY_CATEGORIES,
  type InventoryCategory,
  type InventoryItemCreateInput,
} from '../../types/inventory';
import { Button } from '../ui/Button';

interface CreateInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: InventoryItemCreateInput) => Promise<{ error: Error | null } | void>;
  properties: Property[];
  initialPropertyId?: string | null;
}

const SHARED_PROPERTY_VALUE = '__shared__';

function parseNonNegativeInt(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function parseNonNegativeNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function CreateInventoryItemModal({
  isOpen,
  onClose,
  onSubmit,
  properties,
  initialPropertyId,
}: CreateInventoryItemModalProps) {
  const [propertyId, setPropertyId] = useState<string>(SHARED_PROPERTY_VALUE);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryCategory | ''>('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState<string>(fr.inventory.unit.default);
  const [currentStock, setCurrentStock] = useState('0');
  const [minThreshold, setMinThreshold] = useState('0');
  const [unitCost, setUnitCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPropertyId(initialPropertyId ?? SHARED_PROPERTY_VALUE);
    setName('');
    setCategory('');
    setSku('');
    setUnit(fr.inventory.unit.default);
    setCurrentStock('0');
    setMinThreshold('0');
    setUnitCost('');
    setSupplier('');
    setNotes('');
    setError(null);
    setSubmitting(false);
  }, [isOpen, initialPropertyId]);

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

    const normalizedName = name.trim();
    if (!normalizedName) {
      setError(fr.inventory.create.missingName);
      return;
    }

    if (!category) {
      setError(fr.inventory.create.missingCategory);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({
        property_id: propertyId === SHARED_PROPERTY_VALUE ? null : propertyId,
        name: normalizedName,
        category,
        sku: sku.trim() || null,
        unit: unit.trim() || fr.inventory.unit.default,
        current_stock: parseNonNegativeInt(currentStock),
        min_threshold: parseNonNegativeInt(minThreshold),
        unit_cost: parseNonNegativeNumberOrNull(unitCost),
        supplier: supplier.trim() || null,
        notes: notes.trim() || null,
      });

      if (result && 'error' in result && result.error) {
        setError(fr.inventory.create.createError);
        setSubmitting(false);
        return;
      }

      onClose();
    } catch {
      setError(fr.inventory.create.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-inventory-item-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className={clsx(modalTokens.panel, 'max-w-lg')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="create-inventory-item-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.inventory.create.title}
          </h2>
          <button
            type="button"
            aria-label={fr.inventory.create.cancel}
            onClick={onClose}
            className={iconButtonToken}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <label htmlFor="inventory-property" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.inventory.create.property}
            </label>
            <select
              id="inventory-property"
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              className={inputTokens.base}
            >
              <option value={SHARED_PROPERTY_VALUE}>{fr.inventory.create.propertyShared}</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="inventory-name" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.inventory.create.name}
              </label>
              <input
                id="inventory-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={fr.inventory.create.namePlaceholder}
                className={inputTokens.base}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="inventory-category" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.inventory.create.category}
              </label>
              <select
                id="inventory-category"
                value={category}
                onChange={(event) => setCategory(event.target.value as InventoryCategory | '')}
                className={inputTokens.base}
                required
              >
                <option value="" disabled>
                  {fr.inventory.create.category}
                </option>
                {INVENTORY_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {fr.inventory.category[value]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="inventory-sku" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.inventory.create.sku}
              </label>
              <input
                id="inventory-sku"
                type="text"
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                placeholder={fr.inventory.create.skuPlaceholder}
                className={inputTokens.base}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="inventory-unit" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.inventory.create.unit}
              </label>
              <input
                id="inventory-unit"
                type="text"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder={fr.inventory.create.unitPlaceholder}
                className={inputTokens.base}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="inventory-current-stock" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.inventory.create.currentStock}
              </label>
              <input
                id="inventory-current-stock"
                type="number"
                min={0}
                step={1}
                value={currentStock}
                onChange={(event) => setCurrentStock(event.target.value)}
                className={inputTokens.base}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="inventory-min-threshold" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.inventory.create.minThreshold}
              </label>
              <input
                id="inventory-min-threshold"
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="inventory-unit-cost" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.inventory.create.unitCost}
              </label>
              <input
                id="inventory-unit-cost"
                type="number"
                min={0}
                step="0.01"
                value={unitCost}
                onChange={(event) => setUnitCost(event.target.value)}
                className={inputTokens.base}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="inventory-supplier" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.inventory.create.supplier}
              </label>
              <input
                id="inventory-supplier"
                type="text"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                placeholder={fr.inventory.create.supplierPlaceholder}
                className={inputTokens.base}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="inventory-notes" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.inventory.create.notes}
            </label>
            <textarea
              id="inventory-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={fr.inventory.create.notesPlaceholder}
              className={clsx(inputTokens.base, 'resize-none')}
            />
          </div>

          {error ? (
            <p className={clsx('rounded-lg border px-3 py-2 text-sm', statusTokens.danger)}>{error}</p>
          ) : null}
        </div>

        <div className={clsx('flex items-center justify-end gap-2 border-t px-5 py-3', borderTokens.default)}>
          <Button type="button" variant="tertiary" size="sm" onClick={onClose} disabled={submitting}>
            {fr.inventory.create.cancel}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={submitting}>
            {fr.inventory.create.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
