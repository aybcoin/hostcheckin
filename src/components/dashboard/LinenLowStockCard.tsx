import { Package } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { displayTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { useLinenItems } from '../../hooks/useLinenItems';
import {
  computeLinenSummary,
  isLowStock,
  sortLinenItems,
} from '../../lib/linen-logic';
import { StatusBadge } from '../ui/StatusBadge';
import { DashboardWidgetCard } from './DashboardWidgetCard';

interface LinenLowStockCardProps {
  hostId: string;
  onSeeAll: () => void;
  propertyId?: string | null;
}

export function LinenLowStockCard({ hostId, onSeeAll, propertyId }: LinenLowStockCardProps) {
  const {
    items,
    loading,
    error,
    refresh,
  } = useLinenItems(hostId);
  const filteredItems = items.filter((item) => !propertyId || item.property_id === propertyId);
  const summary = computeLinenSummary(filteredItems);
  const lowStockItems = sortLinenItems(filteredItems.filter((item) => isLowStock(item))).slice(0, 4);
  const primaryItem = lowStockItems[0];

  return (
    <DashboardWidgetCard
      title={fr.dashboardLinen.cardTitle}
      icon={Package}
      seeAllLabel={fr.dashboardLinen.cardSeeAll}
      onSeeAll={onSeeAll}
      loading={loading}
      error={error}
      onRetry={refresh}
      errorDescription={fr.errors.genericDescription}
    >
      <div className="space-y-1">
        <p className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>
          {fr.dashboardLinen.lowStock}
        </p>
        <p className={clsx('text-2xl', displayTokens.number, textTokens.title)}>{summary.lowStockCount}</p>
        <p className={clsx('text-sm', textTokens.muted)}>
          {primaryItem
            ? `${fr.linen.linenType[primaryItem.linen_type]} · ${primaryItem.quantity_clean}/${primaryItem.min_threshold}`
            : fr.dashboardLinen.cardEmpty}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge variant="warning">{fr.dashboardLinen.lowStock}: {summary.lowStockCount}</StatusBadge>
        {summary.criticalCount > 0 ? (
          <StatusBadge variant="danger">{fr.dashboardLinen.critical}: {summary.criticalCount}</StatusBadge>
        ) : null}
      </div>
    </DashboardWidgetCard>
  );
}
