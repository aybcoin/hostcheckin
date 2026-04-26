import { useCallback, useEffect, useMemo, useState } from 'react';
import { fr } from '../lib/i18n/fr';
import { applyMovement, validateMovement } from '../lib/linen-logic';
import { supabase } from '../lib/supabase';
import type {
  LinenItem,
  LinenItemCreateInput,
  LinenItemWithRelations,
  LinenMovement,
  LinenMovementCreateInput,
} from '../types/linen';

interface RawLinenItemRow extends LinenItem {
  properties?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function decorateItems(
  rows: RawLinenItemRow[],
  movements: LinenMovement[],
): LinenItemWithRelations[] {
  const lastMovementMap = new Map<string, string>();
  movements.forEach((movement) => {
    if (!lastMovementMap.has(movement.linen_item_id)) {
      lastMovementMap.set(movement.linen_item_id, movement.created_at);
    }
  });

  return rows.map((row) => {
    const property = toSingle(row.properties);
    return {
      ...row,
      property_name: property?.name ?? undefined,
      last_movement_at: lastMovementMap.get(row.id),
    };
  });
}

export interface UseLinenItemsResult {
  items: LinenItemWithRelations[];
  movements: LinenMovement[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createItem: (
    input: LinenItemCreateInput,
  ) => Promise<{ data: LinenItem | null; error: Error | null }>;
  updateItem: (
    id: string,
    patch: {
      quantity_total?: number;
      quantity_clean?: number;
      quantity_dirty?: number;
      quantity_in_laundry?: number;
      min_threshold?: number;
      notes?: string | null;
      size?: string | null;
    },
  ) => Promise<{ error: Error | null }>;
  recordMovement: (input: LinenMovementCreateInput) => Promise<{ error: Error | null }>;
  deleteItem: (id: string) => Promise<{ error: Error | null }>;
}

export function useLinenItems(hostId: string | null): UseLinenItemsResult {
  const [rawItems, setRawItems] = useState<RawLinenItemRow[]>([]);
  const [movements, setMovements] = useState<LinenMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (showLoader: boolean = true) => {
      if (!hostId) {
        setRawItems([]);
        setMovements([]);
        setLoading(false);
        return;
      }

      if (showLoader) setLoading(true);

      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from('linen_items')
          .select(['*', 'properties(name)'].join(', '))
          .eq('host_id', hostId)
          .order('created_at', { ascending: false });

        if (itemsError) throw itemsError;

        const fetchedItems = (itemsData || []) as unknown as RawLinenItemRow[];
        setRawItems(fetchedItems);

        const itemIds = fetchedItems.map((item) => item.id);
        if (itemIds.length > 0) {
          const { data: movementsData, error: movementsError } = await supabase
            .from('linen_movements')
            .select('*')
            .in('linen_item_id', itemIds)
            .order('created_at', { ascending: false });
          if (movementsError) throw movementsError;
          setMovements((movementsData || []) as unknown as LinenMovement[]);
        } else {
          setMovements([]);
        }

        setError(null);
      } catch (fetchError) {
        console.error('[useLinenItems] Failed to load linen items:', fetchError);
        setError(fr.linen.loadError);
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
      .channel(`linen-live-${hostId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'linen_items' },
        () => {
          void fetchData(false);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'linen_movements' },
        () => {
          void fetchData(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchData, hostId]);

  const items = useMemo<LinenItemWithRelations[]>(
    () => decorateItems(rawItems, movements),
    [rawItems, movements],
  );

  const refresh = useCallback(() => {
    void fetchData(true);
  }, [fetchData]);

  const createItem = useCallback<UseLinenItemsResult['createItem']>(
    async (input) => {
      if (!hostId) return { data: null, error: new Error('Missing hostId') };

      const { data, error: insertError } = await supabase
        .from('linen_items')
        .insert([
          {
            host_id: hostId,
            property_id: input.property_id,
            linen_type: input.linen_type,
            size: input.size?.trim() || null,
            quantity_total: input.quantity_total ?? 0,
            quantity_clean: input.quantity_clean ?? 0,
            quantity_dirty: input.quantity_dirty ?? 0,
            quantity_in_laundry: input.quantity_in_laundry ?? 0,
            min_threshold: input.min_threshold ?? 0,
            notes: input.notes?.trim() || null,
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('[useLinenItems] insert failed:', insertError);
        return { data: null, error: insertError as unknown as Error };
      }

      await fetchData(false);
      return { data: data as LinenItem, error: null };
    },
    [fetchData, hostId],
  );

  const updateItem = useCallback<UseLinenItemsResult['updateItem']>(
    async (id, patch) => {
      const updates: Record<string, unknown> = {};

      if (patch.quantity_total !== undefined) updates.quantity_total = patch.quantity_total;
      if (patch.quantity_clean !== undefined) updates.quantity_clean = patch.quantity_clean;
      if (patch.quantity_dirty !== undefined) updates.quantity_dirty = patch.quantity_dirty;
      if (patch.quantity_in_laundry !== undefined) {
        updates.quantity_in_laundry = patch.quantity_in_laundry;
      }
      if (patch.min_threshold !== undefined) updates.min_threshold = patch.min_threshold;
      if (patch.notes !== undefined) updates.notes = patch.notes?.trim() || null;
      if (patch.size !== undefined) updates.size = patch.size?.trim() || null;

      if (Object.keys(updates).length === 0) return { error: null };

      const { error: updateError } = await supabase
        .from('linen_items')
        .update(updates)
        .eq('id', id);

      if (!updateError) await fetchData(false);
      return { error: (updateError as unknown as Error) ?? null };
    },
    [fetchData],
  );

  const recordMovement = useCallback<UseLinenItemsResult['recordMovement']>(
    async (input) => {
      if (!hostId) return { error: new Error('Missing hostId') };

      const item = items.find((entry) => entry.id === input.linen_item_id);
      if (!item) return { error: new Error('itemNotFound') };

      const validationErrorKey = validateMovement(item, input);
      if (validationErrorKey) return { error: new Error(validationErrorKey) };

      const nextQuantities = applyMovement(item, input);
      if (!nextQuantities) return { error: new Error('recordError') };

      const { error: updateError } = await supabase
        .from('linen_items')
        .update(nextQuantities)
        .eq('id', item.id);
      if (updateError) return { error: updateError as unknown as Error };

      const { error: insertError } = await supabase
        .from('linen_movements')
        .insert([
          {
            linen_item_id: input.linen_item_id,
            movement_type: input.movement_type,
            quantity: input.quantity,
            note: input.note?.trim() || null,
            actor: input.actor?.trim() || null,
          },
        ]);
      if (insertError) return { error: insertError as unknown as Error };

      await fetchData(false);
      return { error: null };
    },
    [fetchData, hostId, items],
  );

  const deleteItem = useCallback<UseLinenItemsResult['deleteItem']>(
    async (id) => {
      const { error: deleteError } = await supabase
        .from('linen_items')
        .delete()
        .eq('id', id);
      if (!deleteError) await fetchData(false);
      return { error: (deleteError as unknown as Error) ?? null };
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
