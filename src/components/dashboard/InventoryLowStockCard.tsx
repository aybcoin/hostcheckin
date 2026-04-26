import { AlertTriangle, ArrowRight, Package } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, statusTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { useInventoryItems } from '../../hooks/useInventoryItems';
import {
  computeInventorySummary,
  isLowStock,
  sortInventoryItems,
} from '../../lib/inventory-logic';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

interface InventoryLowStockCardProps {
  hostId: string;
  onSeeAll: () => void;
}

export function InventoryLowStockCard({ hostId, onSeeAll }: InventoryLowStockCardProps) {
  const { items, loading } = useInventoryItems(hostId);
  const summary = computeInventorySummary(items);
  const lowStockItems = sortInventoryItems(items.filter((item) => isLowStock(item))).slice(0, 4);
  const divideClass = borderTokens.subtle.replace('border-', 'divide-');

  return (
    <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
      <header className="flex items-center justify-between gap-2">
        <h2 className={clsx('flex items-center gap-2 text-base font-semibold', textTokens.title)}>
          <Package aria-hidden size={16} />
          {fr.dashboardInventory.cardTitle}
        </h2>
        <Button variant="tertiary" size="sm" onClick={onSeeAll}>
          {fr.dashboardInventory.cardSeeAll}
          <ArrowRight aria-hidden size={14} />
        </Button>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        <span className={clsx('rounded-full border px-2 py-0.5', statusTokens.warning)}>
          {fr.dashboardInventory.lowStock}: <strong>{summary.lowStockCount}</strong>
        </span>
        {summary.criticalCount > 0 ? (
          <span className={clsx('rounded-full border px-2 py-0.5', statusTokens.danger)}>
            <AlertTriangle aria-hidden size={11} className="mr-1 inline-block align-text-bottom" />
            {fr.dashboardInventory.critical}: <strong>{summary.criticalCount}</strong>
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="text" className="h-4 w-full" />
          ))}
        </div>
      ) : lowStockItems.length === 0 ? (
        <p className={clsx('text-sm', textTokens.muted)}>{fr.dashboardInventory.cardEmpty}</p>
      ) : (
        <ul className={clsx('divide-y', divideClass)}>
          {lowStockItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <p className={clsx('truncate font-medium', textTokens.title)}>
                  {item.name}
                </p>
                <p className={clsx('truncate text-xs', textTokens.muted)}>
                  {item.property_name || fr.inventory.filters.propertyAll}
                </p>
              </div>
              <span className={clsx('rounded-full border px-2 py-0.5 text-[11px] font-medium', statusTokens.warning)}>
                {item.current_stock}/{item.min_threshold}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
