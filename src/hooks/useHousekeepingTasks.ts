import { useCallback, useEffect, useMemo, useState } from 'react';
import { fr } from '../lib/i18n/fr';
import { supabase, type Reservation } from '../lib/supabase';
import type {
  HousekeepingChecklistItem,
  HousekeepingPriority,
  HousekeepingStatus,
  HousekeepingTask,
  HousekeepingTaskCreateInput,
  HousekeepingTaskWithRelations,
} from '../types/housekeeping';

interface RawTaskRow extends HousekeepingTask {
  properties?: { name?: string | null } | Array<{ name?: string | null }> | null;
  reservations?:
    | {
        check_in_date?: string | null;
        check_out_date?: string | null;
        property_id?: string | null;
        guests?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
      }
    | Array<{
        check_in_date?: string | null;
        check_out_date?: string | null;
        property_id?: string | null;
        guests?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
      }>
    | null;
  housekeeping_checklist_items?: HousekeepingChecklistItem[] | null;
}

function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function decorateTasks(
  rows: RawTaskRow[],
  upcoming: Pick<Reservation, 'id' | 'property_id' | 'check_in_date' | 'status'>[],
): HousekeepingTaskWithRelations[] {
  return rows.map((row) => {
    const property = toSingle(row.properties);
    const reservation = toSingle(row.reservations);
    const guest = toSingle(reservation?.guests);
    const checklist = (row.housekeeping_checklist_items || []).slice().sort(
      (left, right) => left.position - right.position,
    );

    let nextCheckInDate: string | null = null;
    const scheduled = row.scheduled_for;
    if (scheduled) {
      const candidates = upcoming
        .filter((res) => res.property_id === row.property_id)
        .filter((res) => res.id !== row.reservation_id)
        .filter((res) => res.status !== 'cancelled')
        .filter((res) => Boolean(res.check_in_date) && res.check_in_date >= scheduled)
        .sort((left, right) => left.check_in_date.localeCompare(right.check_in_date));
      if (candidates.length > 0) {
        nextCheckInDate = candidates[0].check_in_date;
      }
    }

    return {
      ...row,
      photos_urls: row.photos_urls ?? [],
      property_name: property?.name ?? undefined,
      guest_name: guest?.full_name ?? undefined,
      next_check_in_date: nextCheckInDate,
      checklist,
    };
  });
}

export interface UseHousekeepingTasksResult {
  tasks: HousekeepingTaskWithRelations[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createTask: (input: HousekeepingTaskCreateInput) => Promise<{ data: HousekeepingTask | null; error: Error | null }>;
  updateStatus: (
    id: string,
    status: HousekeepingStatus,
    extra?: { issue_note?: string | null },
  ) => Promise<{ error: Error | null }>;
  updatePriority: (id: string, priority: HousekeepingPriority) => Promise<{ error: Error | null }>;
  updateAssignee: (id: string, assigned_to: string | null) => Promise<{ error: Error | null }>;
  updateNotes: (id: string, notes: string | null) => Promise<{ error: Error | null }>;
  toggleChecklistItem: (itemId: string, isDone: boolean) => Promise<{ error: Error | null }>;
  deleteTask: (id: string) => Promise<{ error: Error | null }>;
}

export function useHousekeepingTasks(hostId: string | null): UseHousekeepingTasksResult {
  const [rawTasks, setRawTasks] = useState<RawTaskRow[]>([]);
  const [reservations, setReservations] = useState<
    Pick<Reservation, 'id' | 'property_id' | 'check_in_date' | 'status'>[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(
    async (showLoader: boolean = true) => {
      if (!hostId) {
        setRawTasks([]);
        setReservations([]);
        setLoading(false);
        return;
      }
      if (showLoader) setLoading(true);

      try {
        const [tasksRes, reservationsRes] = await Promise.all([
          supabase
            .from('housekeeping_tasks')
            .select(
              [
                '*',
                'properties(name)',
                'reservations(check_in_date,check_out_date,property_id,guests(full_name))',
                'housekeeping_checklist_items(*)',
              ].join(', '),
            )
            .eq('host_id', hostId)
            .order('scheduled_for', { ascending: true }),
          supabase
            .from('reservations')
            .select('id, property_id, check_in_date, status')
            .order('check_in_date', { ascending: true }),
        ]);

        if (tasksRes.error) throw tasksRes.error;
        if (reservationsRes.error) throw reservationsRes.error;

        setRawTasks((tasksRes.data || []) as RawTaskRow[]);
        setReservations((reservationsRes.data || []) as typeof reservations);
        setError(null);
      } catch (fetchError) {
        console.error('[useHousekeepingTasks] Failed to load tasks:', fetchError);
        setError(fr.errors.dashboard);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [hostId],
  );

  useEffect(() => {
    void fetchTasks(true);
  }, [fetchTasks]);

  useEffect(() => {
    if (!hostId) return;
    const channel = supabase
      .channel(`housekeeping-live-${hostId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'housekeeping_tasks' },
        () => {
          void fetchTasks(false);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'housekeeping_checklist_items' },
        () => {
          void fetchTasks(false);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          void fetchTasks(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchTasks, hostId]);

  const tasks = useMemo<HousekeepingTaskWithRelations[]>(
    () => decorateTasks(rawTasks, reservations),
    [rawTasks, reservations],
  );

  const refresh = useCallback(() => {
    void fetchTasks(true);
  }, [fetchTasks]);

  const createTask = useCallback<UseHousekeepingTasksResult['createTask']>(
    async (input) => {
      if (!hostId) return { data: null, error: new Error('Missing hostId') };

      const { data, error: insertError } = await supabase
        .from('housekeeping_tasks')
        .insert([
          {
            host_id: hostId,
            property_id: input.property_id,
            reservation_id: input.reservation_id ?? null,
            scheduled_for: input.scheduled_for,
            priority: input.priority ?? 'normal',
            due_before: input.due_before ?? null,
            assigned_to: input.assigned_to ?? null,
            notes: input.notes ?? null,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('[useHousekeepingTasks] insert failed:', insertError);
        return { data: null, error: insertError as unknown as Error };
      }
      await fetchTasks(false);
      return { data: data as HousekeepingTask, error: null };
    },
    [fetchTasks, hostId],
  );

  const updateStatus = useCallback<UseHousekeepingTasksResult['updateStatus']>(
    async (id, status, extra) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'in_progress') updates.started_at = new Date().toISOString();
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      if (status === 'validated') updates.validated_at = new Date().toISOString();
      if (status === 'issue_reported') updates.issue_note = extra?.issue_note ?? null;

      const { error: updateError } = await supabase
        .from('housekeeping_tasks')
        .update(updates)
        .eq('id', id);
      if (!updateError) await fetchTasks(false);
      return { error: (updateError as unknown as Error) ?? null };
    },
    [fetchTasks],
  );

  const updatePriority = useCallback<UseHousekeepingTasksResult['updatePriority']>(
    async (id, priority) => {
      const { error: updateError } = await supabase
        .from('housekeeping_tasks')
        .update({ priority })
        .eq('id', id);
      if (!updateError) await fetchTasks(false);
      return { error: (updateError as unknown as Error) ?? null };
    },
    [fetchTasks],
  );

  const updateAssignee = useCallback<UseHousekeepingTasksResult['updateAssignee']>(
    async (id, assigned_to) => {
      const { error: updateError } = await supabase
        .from('housekeeping_tasks')
        .update({ assigned_to, status: assigned_to ? 'assigned' : 'pending' })
        .eq('id', id);
      if (!updateError) await fetchTasks(false);
      return { error: (updateError as unknown as Error) ?? null };
    },
    [fetchTasks],
  );

  const updateNotes = useCallback<UseHousekeepingTasksResult['updateNotes']>(
    async (id, notes) => {
      const { error: updateError } = await supabase
        .from('housekeeping_tasks')
        .update({ notes })
        .eq('id', id);
      if (!updateError) await fetchTasks(false);
      return { error: (updateError as unknown as Error) ?? null };
    },
    [fetchTasks],
  );

  const toggleChecklistItem = useCallback<UseHousekeepingTasksResult['toggleChecklistItem']>(
    async (itemId, isDone) => {
      const { error: updateError } = await supabase
        .from('housekeeping_checklist_items')
        .update({ is_done: isDone, done_at: isDone ? new Date().toISOString() : null })
        .eq('id', itemId);
      if (!updateError) await fetchTasks(false);
      return { error: (updateError as unknown as Error) ?? null };
    },
    [fetchTasks],
  );

  const deleteTask = useCallback<UseHousekeepingTasksResult['deleteTask']>(
    async (id) => {
      const { error: deleteError } = await supabase
        .from('housekeeping_tasks')
        .delete()
        .eq('id', id);
      if (!deleteError) await fetchTasks(false);
      return { error: (deleteError as unknown as Error) ?? null };
    },
    [fetchTasks],
  );

  return {
    tasks,
    loading,
    error,
    refresh,
    createTask,
    updateStatus,
    updatePriority,
    updateAssignee,
    updateNotes,
    toggleChecklistItem,
    deleteTask,
  };
}
