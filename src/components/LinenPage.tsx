import { useMemo, useState } from 'react';
import { Plus, RefreshCw, Shirt } from 'lucide-react';
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
import { useLinenItems } from '../hooks/useLinenItems';
import {
  computeLinenSummary,
  isLowStock,
  sortLinenItems,
} from '../lib/linen-logic';
import type {
  LinenItemCreateInput,
  LinenItemWithRelations,
  LinenMovementCreateInput,
} from '../types/linen';
import type { Property } from '../lib/supabase';
import { toast } from '../lib/toast';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import { LinenItemCard } from './linen/LinenItemCard';
import { MovementModal } from './linen/MovementModal';
import { MovementHistoryModal } from './linen/MovementHistoryModal';
import { CreateLinenItemModal } from './linen/CreateLinenItemModal';

interface LinenPageProps {
  hostId: string;
  properties: Property[];
}

type FilterMode = 'all' | 'low_stock' | 'dirty' | 'in_laundry';

function matchesFilter(item: LinenItemWithRelations, filter: FilterMode): boolean {
  if (filter === 'all') return true;
  if (filter === 'low_stock') return isLowStock(item);
  if (filter === 'dirty') return item.quantity_dirty > 0;
  return item.quantity_in_laundry > 0;
}

const MOVEMENT_ERROR_KEYS = new Set([
  'notEnoughClean',
  'notEnoughDirty',
  'notEnoughInLaundry',
  'quantityRequired',
]);

export function LinenPage({ hostId, properties }: LinenPageProps) {
  const {
    items,
    movements,
    loading,
    error,
    refresh,
    createItem,
    recordMovement,
    deleteItem,
  } = useLinenItems(hostId);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [movementItemId, setMovementItemId] = useState<string | null>(null);
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);

  const summary = useMemo(() => computeLinenSummary(items), [items]);

  const filteredItems = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();

    const filtered = items
      .filter((item) => matchesFilter(item, filter))
      .filter((item) => (propertyFilter === 'all' ? true : item.property_id === propertyFilter))
      .filter((item) => {
        if (!lowerSearch) return true;
        const haystack = [
          fr.linen.linenType[item.linen_type],
          item.size,
          item.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(lowerSearch);
      });

    return sortLinenItems(filtered);
  }, [filter, items, propertyFilter, search]);

  const movementItem = movementItemId
    ? items.find((item) => item.id === movementItemId) ?? null
    : null;

  const historyItem = historyItemId
    ? items.find((item) => item.id === historyItemId) ?? null
    : null;

  const handleCreate = async (input: LinenItemCreateInput) => {
    const result = await createItem(input);
    if (result.error) {
      toast.error(fr.linen.create.createError);
      return { error: result.error };
    }

    toast.success(fr.linen.create.created);
    return { error: null };
  };

  const handleRecordMovement = async (input: LinenMovementCreateInput) => {
    const result = await recordMovement(input);
    if (result.error) {
      if (MOVEMENT_ERROR_KEYS.has(result.error.message)) {
        const key = result.error.message as
          | 'notEnoughClean'
          | 'notEnoughDirty'
          | 'notEnoughInLaundry'
          | 'quantityRequired';
        toast.error(fr.linen.movement[key]);
      } else {
        toast.error(fr.linen.movement.recordError);
      }
      return { error: result.error };
    }

    toast.success(fr.linen.movement.recorded);
    return { error: null };
  };

  const handleDeleteItem = async (item: LinenItemWithRelations) => {
    if (typeof window !== 'undefined' && !window.confirm(fr.linen.confirmDelete)) return;

    const result = await deleteItem(item.id);
    if (result.error) {
      toast.error(fr.linen.deleteError);
      return;
    }

    toast.info(fr.linen.deleted);
    if (movementItemId === item.id) setMovementItemId(null);
    if (historyItemId === item.id) setHistoryItemId(null);
  };

  const filterButtons: { id: FilterMode; label: string }[] = [
    { id: 'all', label: fr.linen.filters.all },
    { id: 'low_stock', label: fr.linen.filters.low_stock },
    { id: 'dirty', label: fr.linen.filters.dirty },
    { id: 'in_laundry', label: fr.linen.filters.in_laundry },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={clsx('text-2xl font-semibold', textTokens.title)}>{fr.linen.pageTitle}</h1>
          <p className={clsx('mt-1 max-w-2xl text-sm', textTokens.muted)}>{fr.linen.pageSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw aria-hidden size={14} />
            {fr.linen.refresh}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus aria-hidden size={14} />
            {fr.linen.addItem}
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label={fr.linen.pageTitle}>
        <SummaryCard label={fr.linen.summary.totalItems} value={summary.totalItems} />
        <SummaryCard label={fr.linen.summary.totalClean} value={summary.totalClean} tone="success" />
        <SummaryCard label={fr.linen.summary.totalDirty} value={summary.totalDirty} tone="warning" />
        <SummaryCard label={fr.linen.summary.totalInLaundry} value={summary.totalInLaundry} tone="info" />
        <SummaryCard
          label={fr.linen.summary.lowStock}
          value={summary.lowStockCount}
          tone={summary.lowStockCount > 0 ? 'danger' : 'neutral'}
        />
      </section>

      <section className={clsx('flex flex-wrap items-center gap-2 rounded-xl border p-3', borderTokens.default, surfaceTokens.panel)}>
        <div role="tablist" aria-label={fr.linen.pageTitle} className="flex flex-wrap gap-1.5">
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

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={propertyFilter}
            onChange={(event) => setPropertyFilter(event.target.value)}
            className={clsx(inputTokens.base, 'w-auto py-1.5 text-xs')}
            aria-label={fr.linen.filters.propertyAll}
          >
            <option value="all">{fr.linen.filters.propertyAll}</option>
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
            placeholder={fr.linen.filters.searchPlaceholder}
            className={clsx(inputTokens.base, 'w-64 max-w-full py-1.5 text-xs')}
            aria-label={fr.linen.filters.searchPlaceholder}
          />
        </div>
      </section>

      {error ? (
        <div className={clsx('rounded-lg border px-4 py-3 text-sm', statusTokens.danger)}>
          {fr.linen.loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} height={160} />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Shirt size={20} />}
          title={fr.linen.empty.title}
          description={fr.linen.empty.description}
          action={(
            <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus aria-hidden size={14} />
              {fr.linen.empty.cta}
            </Button>
          )}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <LinenItemCard
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

      <CreateLinenItemModal
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
  value: number;
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
