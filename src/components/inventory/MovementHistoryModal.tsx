import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  iconButtonToken,
  modalTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type {
  InventoryItemWithRelations,
  InventoryMovement,
  InventoryMovementType,
} from '../../types/inventory';
import { Button } from '../ui/Button';

interface MovementHistoryModalProps {
  isOpen: boolean;
  item: InventoryItemWithRelations | null;
  movements: InventoryMovement[];
  onClose: () => void;
}

const PAGE_SIZE = 20;

function movementChipClass(movementType: InventoryMovementType): string {
  if (movementType === 'restock') return statusTokens.success;
  if (movementType === 'consume' || movementType === 'loss') return statusTokens.warning;
  if (movementType === 'transfer' || movementType === 'adjust') return statusTokens.info;
  return statusTokens.neutral;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

export function MovementHistoryModal({
  isOpen,
  item,
  movements,
  onClose,
}: MovementHistoryModalProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const itemId = item?.id ?? '';

  useEffect(() => {
    if (!isOpen) return;
    setVisibleCount(PAGE_SIZE);
  }, [isOpen, item?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const itemMovements = useMemo(
    () => movements
      .filter((movement) => movement.inventory_item_id === itemId)
      .slice()
      .sort((left, right) => right.created_at.localeCompare(left.created_at)),
    [itemId, movements],
  );

  if (!isOpen || !item) return null;

  const visibleMovements = itemMovements.slice(0, visibleCount);
  const hasMore = visibleCount < itemMovements.length;

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-history-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={clsx(modalTokens.panel, 'max-w-2xl')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="inventory-history-modal-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.inventory.history.title}
          </h2>
          <button
            type="button"
            aria-label={fr.inventory.history.close}
            onClick={onClose}
            className={iconButtonToken}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-5">
          {visibleMovements.length === 0 ? (
            <p className={clsx('text-sm', textTokens.muted)}>{fr.inventory.history.empty}</p>
          ) : (
            <ul className="space-y-2">
              {visibleMovements.map((movement) => (
                <li key={movement.id} className={clsx('rounded-lg border px-3 py-2.5', borderTokens.default)}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', movementChipClass(movement.movement_type))}>
                        {fr.inventory.movementType[movement.movement_type]}
                      </span>
                      <p className={clsx('mt-1 text-sm font-semibold', textTokens.title)}>
                        {movement.quantity}
                      </p>
                      {movement.unit_cost_at_time != null ? (
                        <p className={clsx('mt-1 text-xs', textTokens.muted)}>
                          {fr.inventory.movement.unitCostAtTime}: {formatCurrency(movement.unit_cost_at_time)}
                        </p>
                      ) : null}
                      {movement.actor ? (
                        <p className={clsx('mt-1 text-xs', textTokens.muted)}>
                          {fr.inventory.movement.actor}: {movement.actor}
                        </p>
                      ) : null}
                      {movement.note ? (
                        <p className={clsx('mt-1 text-xs', textTokens.body)}>{movement.note}</p>
                      ) : null}
                    </div>
                    <p className={clsx('text-xs', textTokens.subtle)}>{formatDateTime(movement.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {hasMore ? (
            <div className="flex justify-center pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setVisibleCount((previous) => previous + PAGE_SIZE)}
              >
                {fr.inventory.history.loadMore}
              </Button>
            </div>
          ) : null}
        </div>

        <div className={clsx('flex justify-end border-t px-5 py-3', borderTokens.default)}>
          <Button type="button" variant="tertiary" size="sm" onClick={onClose}>
            {fr.inventory.history.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
