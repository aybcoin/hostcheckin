import { AlertTriangle, ArrowRightLeft, History, Package } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  cardTokens,
  statusTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import {
  isCritical,
  isLowStock,
  isOutOfStock,
} from '../../lib/linen-logic';
import type { LinenItemWithRelations } from '../../types/linen';
import { Button } from '../ui/Button';

interface LinenItemCardProps {
  item: LinenItemWithRelations;
  onRecordMovement: (item: LinenItemWithRelations) => void;
  onSeeHistory: (item: LinenItemWithRelations) => void;
  onDelete: (item: LinenItemWithRelations) => void;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return fr.linen.card.noLastMovement;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fr.linen.card.noLastMovement;
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LinenItemCard({
  item,
  onRecordMovement,
  onSeeHistory,
  onDelete,
}: LinenItemCardProps) {
  const critical = isCritical(item);
  const lowStock = isLowStock(item);
  const outOfStock = isOutOfStock(item);

  return (
    <article
      className={clsx(
        cardTokens.base,
        cardTokens.padding.md,
        'flex flex-col gap-3',
        surfaceTokens.panel,
        critical && borderTokens.danger,
      )}
      data-testid={`linen-item-${item.id}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={clsx('truncate text-base font-semibold', textTokens.title)}>
            <Package aria-hidden size={16} className={clsx('mr-1.5 inline-block align-text-bottom', textTokens.muted)} />
            {fr.linen.linenType[item.linen_type]}
          </h3>
          <p className={clsx('mt-0.5 text-sm', textTokens.muted)}>
            {item.size
              ? `${fr.linen.card.sizeLabel}: ${item.size}`
              : fr.linen.card.sizeLabel}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {critical ? (
              <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', statusTokens.danger)}>
                <AlertTriangle aria-hidden size={12} />
                {fr.linen.badges.critical}
              </span>
            ) : null}
            {lowStock ? (
              <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', statusTokens.warning)}>
                {fr.linen.badges.lowStock}
              </span>
            ) : null}
            {outOfStock ? (
              <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', statusTokens.neutral)}>
                {fr.linen.badges.outOfStock}
              </span>
            ) : null}
          </div>
          <Button variant="dangerSoft" size="sm" onClick={() => onDelete(item)}>
            {fr.linen.actions.delete}
          </Button>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.neutral)}>
          <dt className={clsx('font-medium', textTokens.subtle)}>{fr.linen.state.total}</dt>
          <dd className={clsx('mt-0.5 text-base font-semibold', textTokens.title)}>{item.quantity_total}</dd>
        </div>
        <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.success)}>
          <dt className={clsx('font-medium', textTokens.subtle)}>{fr.linen.state.clean}</dt>
          <dd className={clsx('mt-0.5 text-base font-semibold', textTokens.title)}>{item.quantity_clean}</dd>
        </div>
        <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.warning)}>
          <dt className={clsx('font-medium', textTokens.subtle)}>{fr.linen.state.dirty}</dt>
          <dd className={clsx('mt-0.5 text-base font-semibold', textTokens.title)}>{item.quantity_dirty}</dd>
        </div>
        <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.info)}>
          <dt className={clsx('font-medium', textTokens.subtle)}>{fr.linen.state.inLaundry}</dt>
          <dd className={clsx('mt-0.5 text-base font-semibold', textTokens.title)}>{item.quantity_in_laundry}</dd>
        </div>
      </dl>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className={clsx(textTokens.subtle)}>{fr.linen.card.thresholdLabel}</dt>
          <dd className={clsx('mt-0.5 font-medium', textTokens.body)}>{item.min_threshold}</dd>
        </div>
        <div>
          <dt className={clsx(textTokens.subtle)}>{fr.linen.card.lastMovement}</dt>
          <dd className={clsx('mt-0.5 font-medium', textTokens.body)}>{formatDateTime(item.last_movement_at)}</dd>
        </div>
      </dl>

      <footer className="flex items-center justify-between gap-2 pt-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onRecordMovement(item)}
        >
          <ArrowRightLeft aria-hidden size={14} />
          {fr.linen.card.recordMovement}
        </Button>
        <Button
          variant="tertiary"
          size="sm"
          onClick={() => onSeeHistory(item)}
        >
          <History aria-hidden size={14} />
          {fr.linen.card.seeHistory}
        </Button>
      </footer>
    </article>
  );
}
