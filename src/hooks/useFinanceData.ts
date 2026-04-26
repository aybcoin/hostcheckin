import { useCallback, useEffect, useMemo, useState } from 'react';
import { computePnL } from '../lib/finance-logic';
import { fr } from '../lib/i18n/fr';
import { supabase, type Property, type Reservation } from '../lib/supabase';
import type { MaintenanceTicket } from '../types/maintenance';
import type {
  FinanceTransaction,
  FinanceTransactionCreateInput,
  FinanceTransactionWithRelations,
  Period,
  PnLSummary,
} from '../types/finance';

interface RawFinanceTransactionRow extends FinanceTransaction {
  properties?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

type FinanceReservation = Pick<
  Reservation,
  'id' | 'property_id' | 'total_amount' | 'check_in_date' | 'check_out_date' | 'status'
>;

type FinanceTicket = Pick<
  MaintenanceTicket,
  'id' | 'host_id' | 'property_id' | 'cost_actual' | 'resolved_at' | 'closed_at' | 'updated_at' | 'category'
>;

type FinanceProperty = Pick<Property, 'id' | 'name' | 'host_id'>;

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

function normalizeTransaction(row: RawFinanceTransactionRow): FinanceTransactionWithRelations {
  const property = toSingle(row.properties);
  return {
    ...row,
    amount: Number(row.amount),
    property_name: property?.name ?? undefined,
  };
}

function normalizeReservation(row: FinanceReservation): FinanceReservation {
  return {
    ...row,
    total_amount: row.total_amount == null ? null : Number(row.total_amount),
  };
}

function normalizeTicket(row: FinanceTicket): FinanceTicket {
  return {
    ...row,
    cost_actual: row.cost_actual == null ? null : Number(row.cost_actual),
  };
}

export interface UseFinanceDataResult {
  transactions: FinanceTransactionWithRelations[];
  reservations: FinanceReservation[];
  tickets: FinanceTicket[];
  properties: FinanceProperty[];
  pnl: PnLSummary;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createTransaction: (
    input: FinanceTransactionCreateInput,
  ) => Promise<{ data: FinanceTransaction | null; error: Error | null }>;
  updateTransaction: (
    id: string,
    patch: Partial<FinanceTransactionCreateInput>,
  ) => Promise<{ error: Error | null }>;
  deleteTransaction: (id: string) => Promise<{ error: Error | null }>;
}

export function useFinanceData(
  hostId: string | null,
  period: Period,
  propertyFilter: string | 'all' = 'all',
): UseFinanceDataResult {
  const [transactions, setTransactions] = useState<FinanceTransactionWithRelations[]>([]);
  const [reservations, setReservations] = useState<FinanceReservation[]>([]);
  const [tickets, setTickets] = useState<FinanceTicket[]>([]);
  const [properties, setProperties] = useState<FinanceProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (showLoader: boolean = true) => {
      if (!hostId) {
        setTransactions([]);
        setReservations([]);
        setTickets([]);
        setProperties([]);
        setLoading(false);
        setError(null);
        return;
      }

      if (showLoader) setLoading(true);

      try {
        const [
          transactionsResult,
          reservationsResult,
          ticketsResult,
          propertiesResult,
        ] = await Promise.all([
          supabase
            .from('finance_transactions')
            .select(['*', 'properties(name)'].join(', '))
            .eq('host_id', hostId)
            .order('occurred_on', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase
            .from('reservations')
            .select('id, property_id, total_amount, check_in_date, check_out_date, status')
            .order('check_out_date', { ascending: false }),
          supabase
            .from('maintenance_tickets')
            .select('id, host_id, property_id, cost_actual, resolved_at, closed_at, updated_at, category')
            .eq('host_id', hostId)
            .order('updated_at', { ascending: false }),
          supabase
            .from('properties')
            .select('id, name, host_id')
            .eq('host_id', hostId)
            .order('name', { ascending: true }),
        ]);

        if (transactionsResult.error) throw transactionsResult.error;
        if (reservationsResult.error) throw reservationsResult.error;
        if (ticketsResult.error) throw ticketsResult.error;
        if (propertiesResult.error) throw propertiesResult.error;

        const transactionRows = (transactionsResult.data || []) as unknown as RawFinanceTransactionRow[];
        const reservationRows = (reservationsResult.data || []) as unknown as FinanceReservation[];
        const ticketRows = (ticketsResult.data || []) as unknown as FinanceTicket[];
        const propertyRows = (propertiesResult.data || []) as unknown as FinanceProperty[];

        setTransactions(transactionRows.map(normalizeTransaction));
        setReservations(reservationRows.map(normalizeReservation));
        setTickets(ticketRows.map(normalizeTicket));
        setProperties(propertyRows);
        setError(null);
      } catch (fetchError) {
        console.error('[useFinanceData] Failed to load finance data:', fetchError);
        setError(fr.finance.loadError);
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
      .channel(`finance-live-${hostId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'finance_transactions' },
        () => {
          void fetchData(false);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_tickets' },
        () => {
          void fetchData(false);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          void fetchData(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchData, hostId]);

  const pnl = useMemo<PnLSummary>(
    () =>
      computePnL({
        reservations,
        tickets,
        transactions,
        properties,
        period,
        propertyFilter,
      }),
    [period, properties, propertyFilter, reservations, tickets, transactions],
  );

  const refresh = useCallback(() => {
    void fetchData(true);
  }, [fetchData]);

  const createTransaction = useCallback<UseFinanceDataResult['createTransaction']>(
    async (input) => {
      if (!hostId) return { data: null, error: new Error('Missing hostId') };

      const payload = {
        host_id: hostId,
        property_id: input.property_id ?? null,
        kind: input.kind,
        category: input.category,
        amount: input.amount,
        currency: input.currency?.trim().toUpperCase() || 'EUR',
        occurred_on: input.occurred_on,
        description: input.description?.trim() || null,
        notes: input.notes?.trim() || null,
      };

      const { data, error: insertError } = await supabase
        .from('finance_transactions')
        .insert([payload])
        .select('*')
        .single();

      if (insertError) {
        return { data: null, error: toError(insertError) };
      }

      await fetchData(false);
      return {
        data: data as FinanceTransaction,
        error: null,
      };
    },
    [fetchData, hostId],
  );

  const updateTransaction = useCallback<UseFinanceDataResult['updateTransaction']>(
    async (id, patch) => {
      const updates: Record<string, unknown> = {};

      if (patch.property_id !== undefined) updates.property_id = patch.property_id;
      if (patch.kind !== undefined) updates.kind = patch.kind;
      if (patch.category !== undefined) updates.category = patch.category;
      if (patch.amount !== undefined) updates.amount = patch.amount;
      if (patch.currency !== undefined) updates.currency = patch.currency?.trim().toUpperCase() || 'EUR';
      if (patch.occurred_on !== undefined) updates.occurred_on = patch.occurred_on;
      if (patch.description !== undefined) updates.description = patch.description?.trim() || null;
      if (patch.notes !== undefined) updates.notes = patch.notes?.trim() || null;

      if (Object.keys(updates).length === 0) return { error: null };

      const { error: updateError } = await supabase
        .from('finance_transactions')
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

  const deleteTransaction = useCallback<UseFinanceDataResult['deleteTransaction']>(
    async (id) => {
      const { error: deleteError } = await supabase
        .from('finance_transactions')
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
    transactions,
    reservations,
    tickets,
    properties,
    pnl,
    loading,
    error,
    refresh,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
