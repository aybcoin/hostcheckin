/**
 * useNavBadgeCounts — lightweight Supabase HEAD/COUNT queries that power
 * the sidebar nav badges (housekeeping pending, maintenance urgent, low stock).
 *
 * These queries don't fetch rows — they use `count: 'exact', head: true` for
 * minimal payload. Runs once per host change.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface NavBadgeCountsState {
  housekeepingPending: number;
  maintenanceUrgent: number;
  inventoryLow: number;
}

const initialState: NavBadgeCountsState = {
  housekeepingPending: 0,
  maintenanceUrgent: 0,
  inventoryLow: 0,
};

export function useNavBadgeCounts(hostId: string | null): NavBadgeCountsState {
  const [counts, setCounts] = useState<NavBadgeCountsState>(initialState);

  useEffect(() => {
    if (!hostId) {
      setCounts(initialState);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const [housekeeping, maintenance, inventory] = await Promise.all([
          supabase
            .from('housekeeping_tasks')
            .select('id', { count: 'exact', head: true })
            .eq('host_id', hostId)
            .in('status', ['pending', 'in_progress']),
          supabase
            .from('maintenance_tickets')
            .select('id', { count: 'exact', head: true })
            .eq('host_id', hostId)
            .eq('priority', 'urgent')
            .in('status', ['open', 'in_progress']),
          supabase
            .from('inventory_items')
            .select('id', { count: 'exact', head: true })
            .eq('host_id', hostId)
            .filter('current_stock', 'lte', 'min_threshold'),
        ]);

        if (cancelled) return;

        setCounts({
          housekeepingPending: housekeeping.count ?? 0,
          maintenanceUrgent: maintenance.count ?? 0,
          inventoryLow: inventory.count ?? 0,
        });
      } catch (error) {
        // Silently degrade — badges just won't show counts. Logged for debugging.
        console.warn('[useNavBadgeCounts] failed to load counts:', error);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [hostId]);

  return counts;
}
