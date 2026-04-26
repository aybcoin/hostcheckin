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
import { applyMovement, formatStock, validateMovement } from '../../lib/inventory-logic';
import {
  INVENTORY_MOVEMENT_TYPES,
  type InventoryItemWithRelations,
  type InventoryMovementCreateInput,
  type InventoryMovementType,
} from '../../types/inventory';
import { Button } from '../ui/Button';

interface MovementModalProps {
  isOpen: boolean;
  item: InventoryItemWithRelations | null;
  onClose: () => void;
  onSubmit: (input: InventoryMovementCreateInput) => Promise<{ error: Error | null } | void>;
}

interface StockSnapshot {
  current_stock: number;
  unit: string;
}

function StockBox({ label, values }: { label: string; values: StockSnapshot }) {
  return (
    <div className={clsx('rounded-lg border px-3 py-2', statusTokens.neutral)}>
      <dt className={clsx('text-xs font-medium', textTokens.subtle)}>{label}</dt>
      <dd className={clsx('mt-0.5 text-base font-semibold', textTokens.title)}>{formatStock(values)}</dd>
    </div>
  );
}

export function MovementModal({ isOpen, item, onClose, onSubmit }: MovementModalProps) {
  const [movementType, setMovementType] = useState<InventoryMovementType>('restock');
  const [quantity, setQuantity] = useState('1');
  const [unitCostAtTime, setUnitCostAtTime] = useState('');
  const [actor, setActor] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) return;
    setMovementType('restock');
    setQuantity('1');
    setUnitCostAtTime('');
    setActor('');
    setNote('');
    setSubmitting(false);
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const parsedQuantity = Number(quantity);

  const draftMovement = useMemo(
    () => ({
      movement_type: movementType,
      quantity: Number.isFinite(parsedQuantity) ? parsedQuantity : 0,
    }),
    [movementType, parsedQuantity],
  );

  if (!isOpen || !item) return null;

  const validationKey = validateMovement(item, draftMovement);
  const simulated = applyMovement(item, draftMovement);

  const beforeValues: StockSnapshot = {
    current_stock: item.current_stock,
    unit: item.unit,
  };

  const afterValues: StockSnapshot = {
    current_stock: simulated?.current_stock ?? item.current_stock,
    unit: item.unit,
  };

  const canSubmit = !submitting && validationKey === null && simulated !== null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const parsedUnitCostAtTime = Number(unitCostAtTime);
    const normalizedUnitCostAtTime =
      unitCostAtTime.trim() === ''
        ? null
        : Number.isFinite(parsedUnitCostAtTime) && parsedUnitCostAtTime >= 0
          ? parsedUnitCostAtTime
          : null;

    setSubmitting(true);
    try {
      const result = await onSubmit({
        inventory_item_id: item.id,
        movement_type: movementType,
        quantity: parsedQuantity,
        unit_cost_at_time: normalizedUnitCostAtTime,
        actor: actor.trim() || undefined,
        note: note.trim() || undefined,
      });

      if (!result || !('error' in result) || !result.error) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-movement-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className={clsx(modalTokens.panel, 'max-w-xl')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="inventory-movement-modal-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.inventory.movement.title}
          </h2>
          <button
            type="button"
            aria-label={fr.inventory.movement.cancel}
            onClick={onClose}
            className={iconButtonToken}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="space-y-1.5">
            <label htmlFor="inventory-movement-type" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.inventory.movement.type}
            </label>
            <select
              id="inventory-movement-type"
              value={movementType}
              onChange={(event) => setMovementType(event.target.value as InventoryMovementType)}
              className={inputTokens.base}
            >
              {INVENTORY_MOVEMENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {fr.inventory.movementType[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="inventory-movement-quantity" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.inventory.movement.quantity}
              </label>
              <input
                id="inventory-movement-quantity"
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className={inputTokens.base}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="inventory-movement-unit-cost" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.inventory.movement.unitCostAtTime}
              </label>
              <input
                id="inventory-movement-unit-cost"
                type="number"
                min={0}
                step="0.01"
                value={unitCostAtTime}
                onChange={(event) => setUnitCostAtTime(event.target.value)}
                className={inputTokens.base}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="inventory-movement-actor" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.inventory.movement.actor}
              </label>
              <input
                id="inventory-movement-actor"
                type="text"
                value={actor}
                onChange={(event) => setActor(event.target.value)}
                placeholder={fr.inventory.movement.actorPlaceholder}
                className={inputTokens.base}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="inventory-movement-note" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.inventory.movement.note}
              </label>
              <input
                id="inventory-movement-note"
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={fr.inventory.movement.notePlaceholder}
                className={inputTokens.base}
              />
            </div>
          </div>

          {validationKey ? (
            <p className={clsx('rounded-lg border px-3 py-2 text-sm', statusTokens.danger)}>
              {fr.inventory.movement[validationKey]}
            </p>
          ) : null}

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <StockBox label={fr.inventory.movement.currentBefore} values={beforeValues} />
            <StockBox label={fr.inventory.movement.simulatedAfter} values={afterValues} />
          </dl>
        </div>

        <div className={clsx('flex items-center justify-end gap-2 border-t px-5 py-3', borderTokens.default)}>
          <Button type="button" variant="tertiary" size="sm" onClick={onClose} disabled={submitting}>
            {fr.inventory.movement.cancel}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!canSubmit}>
            {fr.inventory.movement.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
