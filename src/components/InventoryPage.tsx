import { useMemo, useState } from 'react';
import { Package, Plus, RefreshCw } from 'lucide-react';
import { clsx } from '../lib/clsx';
import {
  borderTokens,
  cardTokens,
  chipTokens,
  inputTokens,
  statusTokens,
  surfaceTokens,
  textTokens,
} from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { useInventoryItems } from '../hooks/useInventoryItems';
import {
  computeInventorySummary,
  isLowStock,
  sortInventoryItems,
} from '../lib/inventory-logic';
import type {
  InventoryCategory,
  InventoryItemCreateInput,
  InventoryItemWithRelations,
  InventoryMovementCreateInput,
} from '../types/inventory';
import { INVENTORY_CATEGORIES } from '../types/inventory';
import type { Property } from '../lib/supabase';
import { toast } from '../lib/toast';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import { InventoryItemCard } from './inventory/InventoryItemCard';
import { MovementModal } from './inventory/MovementModal';
import { MovementHistoryModal } from './inventory/MovementHistoryModal';
import { CreateInventoryItemModal } from './inventory/CreateInventoryItemModal';

interface InventoryPageProps {
  hostId: string;
  properties: Property[];
}

type FilterMode = 'all' | 'low_stock' | 'by_category';
type PropertyFilter = 'all' | 'shared' | string;
type CategoryFilter = 'all' | InventoryCategory;

const MOVEMENT_ERROR_KEYS = new Set([
  'notEnoughStock',
  'quantityRequired',
]);

function matchesFilter(
  item: InventoryItemWithRelations,
  filter: FilterMode,
  categoryFilter: CategoryFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'low_stock') return isLowStock(item);
  if (categoryFilter === 'all') return true;
  return item.category === categoryFilter;
}

function matchesProperty(item: InventoryItemWithRelations, propertyFilter: PropertyFilter): boolean {
  if (propertyFilter === 'all') return true;
  if (propertyFilter === 'shared') return item.property_id === null;
  return item.property_id === propertyFilter;
}

function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function InventoryPage({ hostId, properties }: InventoryPageProps) {
  const {
    items,
    movements,
    loading,
    error,
    refresh,
    createItem,
    recordMovement,
    deleteItem,
  } = useInventoryItems(hostId);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>('all');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [movementItemId, setMovementItemId] = useState<string | null>(null);
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);

  const summary = useMemo(() => computeInventorySummary(items), [items]);

  const filteredItems = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();

    const filtered = items
      .filter((item) => matchesFilter(item, filter, categoryFilter))
      .filter((item) => matchesProperty(item, propertyFilter))
      .filter((item) => {
        if (!lowerSearch) return true;
        const haystack = [
          item.name,
          item.sku,
          item.supplier,
          fr.inventory.category[item.category],
          item.property_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(lowerSearch);
      });

    return sortInventoryItems(filtered);
  }, [categoryFilter, filter, items, propertyFilter, search]);

  const movementItem = movementItemId
    ? items.find((item) => item.id === movementItemId) ?? null
    : null;

  const historyItem = historyItemId
    ? items.find((item) => item.id === historyItemId) ?? null
    : null;

  const handleCreate = async (input: InventoryItemCreateInput) => {
    const result = await createItem(input);
    if (result.error) {
      toast.error(fr.inventory.create.createError);
      return { error: result.error };
    }

    toast.success(fr.inventory.create.created);
    return { error: null };
  };

  const handleRecordMovement = async (input: InventoryMovementCreateInput) => {
    const result = await recordMovement(input);
    if (result.error) {
      if (MOVEMENT_ERROR_KEYS.has(result.error.message)) {
        const key = result.error.message as 'notEnoughStock' | 'quantityRequired';
        toast.error(fr.inventory.movement[key]);
      } else {
        toast.error(fr.inventory.movement.recordError);
      }
      return { error: result.error };
    }

    toast.success(fr.inventory.movement.recorded);
    return { error: null };
  };

  const handleDeleteItem = async (item: InventoryItemWithRelations) => {
    if (typeof window !== 'undefined' && !window.confirm(fr.inventory.confirmDelete)) return;

    const result = await deleteItem(item.id);
    if (result.error) {
      toast.error(fr.inventory.deleteError);
      return;
    }

    toast.info(fr.inventory.deleted);
    if (movementItemId === item.id) setMovementItemId(null);
    if (historyItemId === item.id) setHistoryItemId(null);
  };

  const filterButtons: { id: FilterMode; label: string }[] = [
    { id: 'all', label: fr.inventory.filters.all },
    { id: 'low_stock', label: fr.inventory.filters.low_stock },
    { id: 'by_category', label: fr.inventory.filters.by_category },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={clsx('text-2xl font-semibold', textTokens.title)}>{fr.inventory.pageTitle}</h1>
          <p className={clsx('mt-1 max-w-2xl text-sm', textTokens.muted)}>{fr.inventory.pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw aria-hidden size={14} />
            {fr.inventory.refresh}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus aria-hidden size={14} />
            {fr.inventory.addItem}
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label={fr.inventory.pageTitle}>
        <SummaryCard label={fr.inventory.summary.totalItems} value={summary.totalItems} />
        <SummaryCard label={fr.inventory.summary.totalUnits} value={summary.totalUnits} />
        <SummaryCard
          label={fr.inventory.summary.lowStock}
          value={summary.lowStockCount}
          tone={summary.lowStockCount > 0 ? 'danger' : 'neutral'}
        />
        <SummaryCard
          label={fr.inventory.summary.critical}
          value={summary.criticalCount}
          tone={summary.criticalCount > 0 ? 'danger' : 'neutral'}
        />
        <SummaryCard
          label={fr.inventory.summary.totalValue}
          value={formatCurrency(summary.totalValue)}
          tone="info"
        />
      </section>

      <section className={clsx('space-y-3 rounded-xl border p-3', borderTokens.default, surfaceTokens.panel)}>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label={fr.inventory.pageTitle} className="flex flex-wrap gap-1.5">
            {filterButtons.map((button) => (
              <button
                key={button.id}
                role="tab"
                type="button"
                aria-selected={filter === button.id}
                onClick={() => setFilter(button.id)}
                className={clsx(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === button.id ? chipTokens.active : chipTokens.primary,
                )}
              >
                {button.label}
              </button>
            ))}
          </div>

          <select
            value={propertyFilter}
            onChange={(event) => setPropertyFilter(event.target.value)}
            className={clsx(inputTokens.base, 'ml-auto w-auto py-1.5 text-xs')}
            aria-label={fr.inventory.filters.propertyAll}
          >
            <option value="all">{fr.inventory.filters.propertyAll}</option>
            <option value="shared">{fr.inventory.filters.propertyShared}</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={fr.inventory.filters.searchPlaceholder}
            className={clsx(inputTokens.base, 'w-72 max-w-full py-1.5 text-xs')}
            aria-label={fr.inventory.filters.searchPlaceholder}
          />
        </div>

        {filter === 'by_category' ? (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={clsx(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                categoryFilter === 'all' ? chipTokens.active : chipTokens.primary,
              )}
            >
              {fr.inventory.filters.categoryAll}
            </button>
            {INVENTORY_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={clsx(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  categoryFilter === category ? chipTokens.active : chipTokens.primary,
                )}
              >
                {fr.inventory.category[category]}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {error ? (
        <div className={clsx('rounded-lg border px-4 py-3 text-sm', statusTokens.danger)}>
          {fr.inventory.loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} height={180} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Package size={20} />}
          title={fr.inventory.empty.title}
          description={fr.inventory.empty.description}
          action={(
            <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus aria-hidden size={14} />
              {fr.inventory.empty.cta}
            </Button>
          )}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <InventoryItemCard
              key={item.id}
              item={item}
              onRecordMovement={(selected) => setMovementItemId(selected.id)}
              onSeeHistory={(selected) => setHistoryItemId(selected.id)}
              onDelete={(selected) => {
                void handleDeleteItem(selected);
              }}
            />
          ))}
        </div>
      )}

      <MovementModal
        isOpen={Boolean(movementItem)}
        item={movementItem}
        onClose={() => setMovementItemId(null)}
        onSubmit={handleRecordMovement}
      />

      <MovementHistoryModal
        isOpen={Boolean(historyItem)}
        item={historyItem}
        movements={movements}
        onClose={() => setHistoryItemId(null)}
      />

      <CreateInventoryItemModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        properties={properties}
      />
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'success' | 'warning' | 'info' | 'danger';
}

function SummaryCard({ label, value, tone = 'neutral' }: SummaryCardProps) {
  const toneClass =
    tone === 'danger'
      ? textTokens.danger
      : tone === 'success'
        ? textTokens.success
        : tone === 'warning'
          ? textTokens.warning
          : tone === 'info'
            ? textTokens.info
            : textTokens.title;

  return (
    <div className={clsx(cardTokens.base, cardTokens.padding.sm, 'flex flex-col', surfaceTokens.panel)}>
      <span className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>{label}</span>
      <span className={clsx('mt-1 text-2xl font-semibold', toneClass)}>{value}</span>
    </div>
  );
}
