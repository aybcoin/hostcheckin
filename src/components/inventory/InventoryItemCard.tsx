import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Coffee,
  Cookie,
  Droplet,
  FileText,
  HeartPulse,
  History,
  Package,
  Plug,
  SprayCan,
  Utensils,
} from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  cardTokens,
  statusTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { formatStock, isCritical, isLowStock, isOutOfStock } from '../../lib/inventory-logic';
import type { InventoryCategory, InventoryItemWithRelations } from '../../types/inventory';
import { Button } from '../ui/Button';

interface InventoryItemCardProps {
  item: InventoryItemWithRelations;
  onRecordMovement: (item: InventoryItemWithRelations) => void;
  onSeeHistory: (item: InventoryItemWithRelations) => void;
  onDelete: (item: InventoryItemWithRelations) => void;
}

const CATEGORY_ICONS: Record<InventoryCategory, LucideIcon> = {
  toiletries: Droplet,
  paper: FileText,
  kitchen: Utensils,
  snacks: Cookie,
  beverages: Coffee,
  electronics: Plug,
  cleaning_supplies: SprayCan,
  first_aid: HeartPulse,
  other: Package,
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return fr.inventory.state.noLastMovement;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fr.inventory.state.noLastMovement;
  return parsed.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatUnitCost(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

export function InventoryItemCard({
  item,
  onRecordMovement,
  onSeeHistory,
  onDelete,
}: InventoryItemCardProps) {
  const critical = isCritical(item);
  const lowStock = isLowStock(item);
  const outOfStock = isOutOfStock(item);
  const CategoryIcon = CATEGORY_ICONS[item.category];

  return (
    <article
      className={clsx(
        cardTokens.base,
        cardTokens.padding.md,
        'flex flex-col gap-3',
        surfaceTokens.panel,
        critical && borderTokens.danger,
      )}
      data-testid={`inventory-item-${item.id}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={clsx('truncate text-base font-semibold', textTokens.title)}>
            <CategoryIcon
              aria-hidden
              size={16}
              className={clsx('mr-1.5 inline-block align-text-bottom', textTokens.muted)}
            />
            {item.name}
          </h3>
          <p className={clsx('mt-0.5 text-sm', textTokens.muted)}>
            {fr.inventory.category[item.category]}
          </p>
          {item.sku ? (
            <p className={clsx('mt-1 text-xs', textTokens.subtle)}>
              {item.sku}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {critical ? (
              <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium', statusTokens.danger)}>
                <AlertTriangle aria-hidden size={12} />
                {fr.inventory.badges.critical}
              </span>
            ) : null}
            {lowStock ? (
              <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', statusTokens.warning)}>
                {fr.inventory.badges.lowStock}
              </span>
            ) : null}
            {outOfStock ? (
              <span className={clsx('inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium', statusTokens.neutral)}>
                {fr.inventory.badges.outOfStock}
              </span>
            ) : null}
          </div>
          <Button variant="dangerSoft" size="sm" onClick={() => onDelete(item)}>
            {fr.inventory.actions.delete}
          </Button>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.neutral)}>
          <dt className={clsx('font-medium', textTokens.subtle)}>{fr.inventory.state.stock}</dt>
          <dd className={clsx('mt-0.5 text-base font-semibold', textTokens.title)}>{formatStock(item)}</dd>
        </div>
        <div className={clsx('rounded-lg border px-2.5 py-2', statusTokens.warning)}>
          <dt className={clsx('font-medium', textTokens.subtle)}>{fr.inventory.state.threshold}</dt>
          <dd className={clsx('mt-0.5 text-base font-semibold', textTokens.title)}>{item.min_threshold}</dd>
        </div>
      </dl>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className={clsx(textTokens.subtle)}>{fr.inventory.state.unitCost}</dt>
          <dd className={clsx('mt-0.5 font-medium', textTokens.body)}>{formatUnitCost(item.unit_cost)}</dd>
        </div>
        <div>
          <dt className={clsx(textTokens.subtle)}>{fr.inventory.state.supplier}</dt>
          <dd className={clsx('mt-0.5 font-medium', textTokens.body)}>{item.supplier || '—'}</dd>
        </div>
        <div>
          <dt className={clsx(textTokens.subtle)}>{fr.inventory.create.property}</dt>
          <dd className={clsx('mt-0.5 font-medium', textTokens.body)}>
            {item.property_name || fr.inventory.filters.propertyAll}
          </dd>
        </div>
        <div>
          <dt className={clsx(textTokens.subtle)}>{fr.inventory.state.lastMovement}</dt>
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
          {fr.inventory.card.recordMovement}
        </Button>
        <Button
          variant="tertiary"
          size="sm"
          onClick={() => onSeeHistory(item)}
        >
          <History aria-hidden size={14} />
          {fr.inventory.card.seeHistory}
        </Button>
      </footer>
    </article>
  );
}
