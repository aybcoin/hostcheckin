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
import { applyMovement, validateMovement } from '../../lib/linen-logic';
import {
  LINEN_MOVEMENT_TYPES,
  type LinenItemWithRelations,
  type LinenMovementCreateInput,
  type LinenMovementType,
} from '../../types/linen';
import { Button } from '../ui/Button';

interface MovementModalProps {
  isOpen: boolean;
  item: LinenItemWithRelations | null;
  onClose: () => void;
  onSubmit: (input: LinenMovementCreateInput) => Promise<{ error: Error | null } | void>;
}

interface QuantitySnapshot {
  quantity_total: number;
  quantity_clean: number;
  quantity_dirty: number;
  quantity_in_laundry: number;
}

function QuantityStateGrid({ values }: { values: QuantitySnapshot }) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-xs">
      <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.neutral)}>
        <dt className={clsx('font-medium', textTokens.subtle)}>{fr.linen.state.total}</dt>
        <dd className={clsx('mt-0.5 text-base font-semibold', textTokens.title)}>{values.quantity_total}</dd>
      </div>
      <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.success)}>
        <dt className={clsx('font-medium', textTokens.subtle)}>{fr.linen.state.clean}</dt>
        <dd className={clsx('mt-0.5 text-base font-semibold', textTokens.title)}>{values.quantity_clean}</dd>
      </div>
      <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.warning)}>
        <dt className={clsx('font-medium', textTokens.subtle)}>{fr.linen.state.dirty}</dt>
        <dd className={clsx('mt-0.5 text-base font-semibold', textTokens.title)}>{values.quantity_dirty}</dd>
      </div>
      <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.info)}>
        <dt className={clsx('font-medium', textTokens.subtle)}>{fr.linen.state.inLaundry}</dt>
        <dd className={clsx('mt-0.5 text-base font-semibold', textTokens.title)}>{values.quantity_in_laundry}</dd>
      </div>
    </dl>
  );
}

export function MovementModal({ isOpen, item, onClose, onSubmit }: MovementModalProps) {
  const [movementType, setMovementType] = useState<LinenMovementType>('use_to_dirty');
  const [quantity, setQuantity] = useState('1');
  const [actor, setActor] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) return;
    setMovementType('use_to_dirty');
    setQuantity('1');
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

  const beforeValues: QuantitySnapshot = {
    quantity_total: item.quantity_total,
    quantity_clean: item.quantity_clean,
    quantity_dirty: item.quantity_dirty,
    quantity_in_laundry: item.quantity_in_laundry,
  };

  const afterValues: QuantitySnapshot = simulated ?? beforeValues;

  const canSubmit = !submitting && validationKey === null && simulated !== null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const result = await onSubmit({
        linen_item_id: item.id,
        movement_type: movementType,
        quantity: parsedQuantity,
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
      aria-labelledby="linen-movement-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className={clsx(modalTokens.panel, 'max-w-xl')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="linen-movement-modal-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.linen.movement.title}
          </h2>
          <button
            type="button"
            aria-label={fr.linen.movement.cancel}
            onClick={onClose}
            className={iconButtonToken}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="space-y-1.5">
            <label htmlFor="movement-type" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.linen.movement.type}
            </label>
            <select
              id="movement-type"
              value={movementType}
              onChange={(event) => setMovementType(event.target.value as LinenMovementType)}
              className={inputTokens.base}
            >
              {LINEN_MOVEMENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {fr.linen.movementType[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="movement-quantity" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.linen.movement.quantity}
            </label>
            <input
              id="movement-quantity"
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={inputTokens.base}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="movement-actor" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.linen.movement.actor}
              </label>
              <input
                id="movement-actor"
                type="text"
                value={actor}
                onChange={(event) => setActor(event.target.value)}
                placeholder={fr.linen.movement.actorPlaceholder}
                className={inputTokens.base}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="movement-note" className={clsx('text-sm font-medium', textTokens.title)}>
                {fr.linen.movement.note}
              </label>
              <input
                id="movement-note"
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={fr.linen.movement.notePlaceholder}
                className={inputTokens.base}
              />
            </div>
          </div>

          {validationKey ? (
            <p className={clsx('rounded-lg border px-3 py-2 text-sm', statusTokens.danger)}>
              {fr.linen.movement[validationKey]}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <h3 className={clsx('mb-2 text-sm font-medium', textTokens.title)}>{fr.linen.movement.currentBefore}</h3>
              <QuantityStateGrid values={beforeValues} />
            </div>
            <div>
              <h3 className={clsx('mb-2 text-sm font-medium', textTokens.title)}>{fr.linen.movement.simulatedAfter}</h3>
              <QuantityStateGrid values={afterValues} />
            </div>
          </div>
        </div>

        <div className={clsx('flex items-center justify-end gap-2 border-t px-5 py-3', borderTokens.default)}>
          <Button type="button" variant="tertiary" size="sm" onClick={onClose} disabled={submitting}>
            {fr.linen.movement.cancel}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={!canSubmit}>
            {fr.linen.movement.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
