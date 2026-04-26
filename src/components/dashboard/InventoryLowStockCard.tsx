import { Package } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { displayTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { useInventoryItems } from '../../hooks/useInventoryItems';
import {
  computeInventorySummary,
  isLowStock,
  sortInventoryItems,
} from '../../lib/inventory-logic';
import { StatusBadge } from '../ui/StatusBadge';
import { DashboardWidgetCard } from './DashboardWidgetCard';

interface InventoryLowStockCardProps {
  hostId: string;
  onSeeAll: () => void;
  propertyId?: string | null;
}

export function InventoryLowStockCard({ hostId, onSeeAll, propertyId }: InventoryLowStockCardProps) {
  const {
    items,
    loading,
    error,
    refresh,
  } = useInventoryItems(hostId);
  const filteredItems = items.filter((item) => !propertyId || item.property_id === propertyId);
  const summary = computeInventorySummary(filteredItems);
  const lowStockItems = sortInventoryItems(filteredItems.filter((item) => isLowStock(item))).slice(0, 4);
  const primaryItem = lowStockItems[0];

  return (
    <DashboardWidgetCard
      title={fr.dashboardInventory.cardTitle}
      icon={Package}
      seeAllLabel={fr.dashboardInventory.cardSeeAll}
      onSeeAll={onSeeAll}
      loading={loading}
      error={error}
      onRetry={refresh}
      errorDescription={fr.errors.genericDescription}
    >
      <div className="space-y-1">
        <p className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>
          {fr.dashboardInventory.lowStock}
        </p>
        <p className={clsx('text-2xl', displayTokens.number, textTokens.title)}>{summary.lowStockCount}</p>
        <p className={clsx('text-sm', textTokens.muted)}>
          {primaryItem
            ? `${primaryItem.name} · ${primaryItem.current_stock}/${primaryItem.min_threshold}`
            : fr.dashboardInventory.cardEmpty}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge variant="warning">{fr.dashboardInventory.lowStock}: {summary.lowStockCount}</StatusBadge>
        {summary.criticalCount > 0 ? (
          <StatusBadge variant="danger">{fr.dashboardInventory.critical}: {summary.criticalCount}</StatusBadge>
        ) : null}
      </div>
    </DashboardWidgetCard>
  );
}
