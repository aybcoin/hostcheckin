import { useCallback, useEffect, useMemo, useState } from 'react';
import { fr } from '../lib/i18n/fr';
import { applyMovement, validateMovement } from '../lib/inventory-logic';
import { supabase } from '../lib/supabase';
import type {
  InventoryItem,
  InventoryItemCreateInput,
  InventoryItemWithRelations,
  InventoryMovement,
  InventoryMovementCreateInput,
} from '../types/inventory';

interface RawInventoryItemRow extends Omit<InventoryItem, 'current_stock' | 'min_threshold' | 'unit_cost'> {
  current_stock: number | string;
  min_threshold: number | string;
  unit_cost: number | string | null;
  properties?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

interface RawInventoryMovementRow extends Omit<InventoryMovement, 'quantity' | 'unit_cost_at_time'> {
  quantity: number | string;
  unit_cost_at_time: number | string | null;
}

interface SupabaseErrorLike {
  message: string;
}

function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof (error as SupabaseErrorLike).message === 'string'
  ) {
    return new Error((error as SupabaseErrorLike).message);
  }
  return new Error('Unknown error');
}

function toFiniteNumber(value: number | string, fallback: number = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: number | string | null): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function decorateItems(
  rows: RawInventoryItemRow[],
  movements: InventoryMovement[],
): InventoryItemWithRelations[] {
  const lastMovementMap = new Map<string, string>();
  movements.forEach((movement) => {
    if (!lastMovementMap.has(movement.inventory_item_id)) {
      lastMovementMap.set(movement.inventory_item_id, movement.created_at);
    }
  });

  return rows.map((row) => {
    const property = toSingle(row.properties);
    return {
      ...row,
      current_stock: toFiniteNumber(row.current_stock),
      min_threshold: toFiniteNumber(row.min_threshold),
      unit_cost: toNullableNumber(row.unit_cost),
      property_name: property?.name ?? undefined,
      last_movement_at: lastMovementMap.get(row.id),
    };
  });
}

function normalizeMovementRows(rows: RawInventoryMovementRow[]): InventoryMovement[] {
  return rows.map((row) => ({
    ...row,
    quantity: toFiniteNumber(row.quantity),
    unit_cost_at_time: toNullableNumber(row.unit_cost_at_time),
  }));
}

export interface UseInventoryItemsResult {
  items: InventoryItemWithRelations[];
  movements: InventoryMovement[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createItem: (
    input: InventoryItemCreateInput,
  ) => Promise<{ data: InventoryItem | null; error: Error | null }>;
  updateItem: (
    id: string,
    patch: {
      current_stock?: number;
      min_threshold?: number;
      unit_cost?: number | null;
      supplier?: string | null;
      notes?: string | null;
      name?: string;
      sku?: string | null;
      unit?: string;
    },
  ) => Promise<{ error: Error | null }>;
  recordMovement: (input: InventoryMovementCreateInput) => Promise<{ error: Error | null }>;
  deleteItem: (id: string) => Promise<{ error: Error | null }>;
}

export function useInventoryItems(hostId: string | null): UseInventoryItemsResult {
  const [rawItems, setRawItems] = useState<RawInventoryItemRow[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (showLoader: boolean = true) => {
      if (!hostId) {
        setRawItems([]);
        setMovements([]);
        setLoading(false);
        setError(null);
        return;
      }

      if (showLoader) setLoading(true);

      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from('inventory_items')
          .select(['*', 'properties(name)'].join(', '))
          .eq('host_id', hostId)
          .order('created_at', { ascending: false });

        if (itemsError) throw itemsError;

        const fetchedItems = (itemsData || []) as unknown as RawInventoryItemRow[];
        setRawItems(fetchedItems);

        const itemIds = fetchedItems.map((item) => item.id);
        if (itemIds.length > 0) {
          const { data: movementsData, error: movementsError } = await supabase
            .from('inventory_movements')
            .select('*')
            .in('inventory_item_id', itemIds)
            .order('created_at', { ascending: false });
          if (movementsError) throw movementsError;
          setMovements(normalizeMovementRows((movementsData || []) as unknown as RawInventoryMovementRow[]));
        } else {
          setMovements([]);
        }

        setError(null);
      } catch (fetchError) {
        console.error('[useInventoryItems] Failed to load inventory:', fetchError);
        setError(fr.inventory.loadError);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [hostId],
  );

  useEffect(() => {
    void fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (!hostId) return;

    const channel = supabase
      .channel(`inventory-live-${hostId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items' },
        () => {
          void fetchData(false);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_movements' },
        () => {
          void fetchData(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchData, hostId]);

  const items = useMemo<InventoryItemWithRelations[]>(
    () => decorateItems(rawItems, movements),
    [rawItems, movements],
  );

  const refresh = useCallback(() => {
    void fetchData(true);
  }, [fetchData]);

  const createItem = useCallback<UseInventoryItemsResult['createItem']>(
    async (input) => {
      if (!hostId) return { data: null, error: new Error('Missing hostId') };

      const { data, error: insertError } = await supabase
        .from('inventory_items')
        .insert([
          {
            host_id: hostId,
            property_id: input.property_id ?? null,
            name: input.name.trim(),
            category: input.category,
            sku: input.sku?.trim() || null,
            unit: input.unit?.trim() || 'unit',
            current_stock: input.current_stock ?? 0,
            min_threshold: input.min_threshold ?? 0,
            unit_cost: input.unit_cost ?? null,
            supplier: input.supplier?.trim() || null,
            notes: input.notes?.trim() || null,
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('[useInventoryItems] insert failed:', insertError);
        return { data: null, error: toError(insertError) };
      }

      await fetchData(false);

      const created = data as RawInventoryItemRow;
      return {
        data: {
          ...created,
          current_stock: toFiniteNumber(created.current_stock),
          min_threshold: toFiniteNumber(created.min_threshold),
          unit_cost: toNullableNumber(created.unit_cost),
        },
        error: null,
      };
    },
    [fetchData, hostId],
  );

  const updateItem = useCallback<UseInventoryItemsResult['updateItem']>(
    async (id, patch) => {
      const updates: Record<string, unknown> = {};

      if (patch.current_stock !== undefined) updates.current_stock = patch.current_stock;
      if (patch.min_threshold !== undefined) updates.min_threshold = patch.min_threshold;
      if (patch.unit_cost !== undefined) updates.unit_cost = patch.unit_cost;
      if (patch.supplier !== undefined) updates.supplier = patch.supplier?.trim() || null;
      if (patch.notes !== undefined) updates.notes = patch.notes?.trim() || null;
      if (patch.name !== undefined) updates.name = patch.name.trim();
      if (patch.sku !== undefined) updates.sku = patch.sku?.trim() || null;
      if (patch.unit !== undefined) updates.unit = patch.unit.trim() || 'unit';

      if (Object.keys(updates).length === 0) return { error: null };

      const { error: updateError } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        return { error: toError(updateError) };
      }

      await fetchData(false);
      return { error: null };
    },
    [fetchData],
  );

  const recordMovement = useCallback<UseInventoryItemsResult['recordMovement']>(
    async (input) => {
      if (!hostId) return { error: new Error('Missing hostId') };

      const item = items.find((entry) => entry.id === input.inventory_item_id);
      if (!item) return { error: new Error('itemNotFound') };

      const validationError = validateMovement(item, input);
      if (validationError) return { error: new Error(validationError) };

      const nextStock = applyMovement(item, input);
      if (!nextStock) return { error: new Error('recordError') };

      const { error: updateError } = await supabase
        .from('inventory_items')
        .update(nextStock)
        .eq('id', item.id);
      if (updateError) return { error: toError(updateError) };

      const { error: insertError } = await supabase
        .from('inventory_movements')
        .insert([
          {
            inventory_item_id: input.inventory_item_id,
            movement_type: input.movement_type,
            quantity: input.quantity,
            unit_cost_at_time: input.unit_cost_at_time ?? null,
            note: input.note?.trim() || null,
            actor: input.actor?.trim() || null,
          },
        ]);
      if (insertError) return { error: toError(insertError) };

      await fetchData(false);
      return { error: null };
    },
    [fetchData, hostId, items],
  );

  const deleteItem = useCallback<UseInventoryItemsResult['deleteItem']>(
    async (id) => {
      const { error: deleteError } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return { error: toError(deleteError) };
      }

      await fetchData(false);
      return { error: null };
    },
    [fetchData],
  );

  return {
    items,
    movements,
    loading,
    error,
    refresh,
    createItem,
    updateItem,
    recordMovement,
    deleteItem,
  };
}
