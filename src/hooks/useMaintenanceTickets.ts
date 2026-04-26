import { useCallback, useEffect, useMemo, useState } from 'react';
import { fr } from '../lib/i18n/fr';
import { supabase } from '../lib/supabase';
import type {
  MaintenanceComment,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceTicket,
  MaintenanceTicketCreateInput,
  MaintenanceTicketWithRelations,
} from '../types/maintenance';

interface RawTicketRow extends MaintenanceTicket {
  properties?: { name?: string | null } | Array<{ name?: string | null }> | null;
  maintenance_comments?: Array<{ id: string }> | null;
}

function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function decorateTickets(rows: RawTicketRow[]): MaintenanceTicketWithRelations[] {
  return rows.map((row) => {
    const property = toSingle(row.properties);
    const commentsCount = Array.isArray(row.maintenance_comments)
      ? row.maintenance_comments.length
      : 0;
    return {
      ...row,
      photos_urls: row.photos_urls ?? [],
      property_name: property?.name ?? undefined,
      comments_count: commentsCount,
    };
  });
}

export interface UseMaintenanceTicketsResult {
  tickets: MaintenanceTicketWithRelations[];
  comments: MaintenanceComment[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createTicket: (
    input: MaintenanceTicketCreateInput,
  ) => Promise<{ data: MaintenanceTicket | null; error: Error | null }>;
  updateStatus: (id: string, status: MaintenanceStatus) => Promise<{ error: Error | null }>;
  updatePriority: (id: string, priority: MaintenancePriority) => Promise<{ error: Error | null }>;
  updateAssignee: (id: string, assigned_to: string | null) => Promise<{ error: Error | null }>;
  updateCosts: (
    id: string,
    costs: { cost_estimate?: number | null; cost_actual?: number | null },
  ) => Promise<{ error: Error | null }>;
  updateNotes: (id: string, notes: string | null) => Promise<{ error: Error | null }>;
  addComment: (
    ticketId: string,
    body: string,
    author?: string | null,
  ) => Promise<{ error: Error | null }>;
  deleteTicket: (id: string) => Promise<{ error: Error | null }>;
}

export function useMaintenanceTickets(hostId: string | null): UseMaintenanceTicketsResult {
  const [rawTickets, setRawTickets] = useState<RawTicketRow[]>([]);
  const [comments, setComments] = useState<MaintenanceComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(
    async (showLoader: boolean = true) => {
      if (!hostId) {
        setRawTickets([]);
        setComments([]);
        setLoading(false);
        return;
      }
      if (showLoader) setLoading(true);

      try {
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('maintenance_tickets')
          .select(
            ['*', 'properties(name)', 'maintenance_comments(id)'].join(', '),
          )
          .eq('host_id', hostId)
          .order('reported_at', { ascending: false });

        if (ticketsError) throw ticketsError;

        const fetchedRows = (ticketsData || []) as unknown as RawTicketRow[];
        setRawTickets(fetchedRows);

        // Fetch comments for all tickets in this host's scope.
        const ticketIds = fetchedRows.map((row) => row.id);
        if (ticketIds.length > 0) {
          const { data: commentsData, error: commentsError } = await supabase
            .from('maintenance_comments')
            .select('*')
            .in('ticket_id', ticketIds)
            .order('created_at', { ascending: true });
          if (commentsError) throw commentsError;
          setComments((commentsData || []) as unknown as MaintenanceComment[]);
        } else {
          setComments([]);
        }

        setError(null);
      } catch (fetchError) {
        console.error('[useMaintenanceTickets] Failed to load tickets:', fetchError);
        setError(fr.errors.dashboard);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [hostId],
  );

  useEffect(() => {
    void fetchTickets(true);
  }, [fetchTickets]);

  useEffect(() => {
    if (!hostId) return;
    const channel = supabase
      .channel(`maintenance-live-${hostId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_tickets' },
        () => {
          void fetchTickets(false);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_comments' },
        () => {
          void fetchTickets(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchTickets, hostId]);

  const tickets = useMemo<MaintenanceTicketWithRelations[]>(
    () => decorateTickets(rawTickets),
    [rawTickets],
  );

  const refresh = useCallback(() => {
    void fetchTickets(true);
  }, [fetchTickets]);

  const createTicket = useCallback<UseMaintenanceTicketsResult['createTicket']>(
    async (input) => {
      if (!hostId) return { data: null, error: new Error('Missing hostId') };

      const { data, error: insertError } = await supabase
        .from('maintenance_tickets')
        .insert([
          {
            host_id: hostId,
            property_id: input.property_id,
            reservation_id: input.reservation_id ?? null,
            title: input.title,
            description: input.description ?? null,
            category: input.category,
            priority: input.priority ?? 'normal',
            assigned_to: input.assigned_to ?? null,
            cost_estimate: input.cost_estimate ?? null,
            notes: input.notes ?? null,
            status: 'open',
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error('[useMaintenanceTickets] insert failed:', insertError);
        return { data: null, error: insertError as unknown as Error };
      }
      await fetchTickets(false);
      return { data: data as MaintenanceTicket, error: null };
    },
    [fetchTickets, hostId],
  );

  const updateStatus = useCallback<UseMaintenanceTicketsResult['updateStatus']>(
    async (id, status) => {
      const updates: Record<string, unknown> = { status };
      const nowIso = new Date().toISOString();
      if (status === 'resolved') {
        updates.resolved_at = nowIso;
      }
      if (status === 'closed') {
        updates.closed_at = nowIso;
      }
      // Reopening clears the closed/resolved timestamps so the ticket re-enters the open flow.
      if (status === 'in_progress') {
        updates.resolved_at = null;
        updates.closed_at = null;
      }

      const { error: updateError } = await supabase
        .from('maintenance_tickets')
        .update(updates)
        .eq('id', id);
      if (!updateError) await fetchTickets(false);
      return { error: (updateError as unknown as Error) ?? null };
    },
    [fetchTickets],
  );

  const updatePriority = useCallback<UseMaintenanceTicketsResult['updatePriority']>(
    async (id, priority) => {
      const { error: updateError } = await supabase
        .from('maintenance_tickets')
        .update({ priority })
        .eq('id', id);
      if (!updateError) await fetchTickets(false);
      return { error: (updateError as unknown as Error) ?? null };
    },
    [fetchTickets],
  );

  const updateAssignee = useCallback<UseMaintenanceTicketsResult['updateAssignee']>(
    async (id, assigned_to) => {
      const { error: updateError } = await supabase
        .from('maintenance_tickets')
        .update({ assigned_to })
        .eq('id', id);
      if (!updateError) await fetchTickets(false);
      return { error: (updateError as unknown as Error) ?? null };
    },
    [fetchTickets],
  );

  const updateCosts = useCallback<UseMaintenanceTicketsResult['updateCosts']>(
    async (id, costs) => {
      const updates: Record<string, unknown> = {};
      if (costs.cost_estimate !== undefined) updates.cost_estimate = costs.cost_estimate;
      if (costs.cost_actual !== undefined) updates.cost_actual = costs.cost_actual;
      if (Object.keys(updates).length === 0) return { error: null };

      const { error: updateError } = await supabase
        .from('maintenance_tickets')
        .update(updates)
        .eq('id', id);
      if (!updateError) await fetchTickets(false);
      return { error: (updateError as unknown as Error) ?? null };
    },
    [fetchTickets],
  );

  const updateNotes = useCallback<UseMaintenanceTicketsResult['updateNotes']>(
    async (id, notes) => {
      const { error: updateError } = await supabase
        .from('maintenance_tickets')
        .update({ notes })
        .eq('id', id);
      if (!updateError) await fetchTickets(false);
      return { error: (updateError as unknown as Error) ?? null };
    },
    [fetchTickets],
  );

  const addComment = useCallback<UseMaintenanceTicketsResult['addComment']>(
    async (ticketId, body, author = null) => {
      const { error: insertError } = await supabase
        .from('maintenance_comments')
        .insert([{ ticket_id: ticketId, body, author }]);
      if (!insertError) await fetchTickets(false);
      return { error: (insertError as unknown as Error) ?? null };
    },
    [fetchTickets],
  );

  const deleteTicket = useCallback<UseMaintenanceTicketsResult['deleteTicket']>(
    async (id) => {
      const { error: deleteError } = await supabase
        .from('maintenance_tickets')
        .delete()
        .eq('id', id);
      if (!deleteError) await fetchTickets(false);
      return { error: (deleteError as unknown as Error) ?? null };
    },
    [fetchTickets],
  );

  return {
    tickets,
    comments,
    loading,
    error,
    refresh,
    createTicket,
    updateStatus,
    updatePriority,
    updateAssignee,
    updateCosts,
    updateNotes,
    addComment,
    deleteTicket,
  };
}
