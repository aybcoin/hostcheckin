import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  computeAnalyticsSummary,
  exportAnalyticsCsv,
} from '../lib/analytics-logic';
import { resolvePeriod } from '../lib/finance-logic';
import { fr } from '../lib/i18n/fr';
import { supabase, type Property, type Reservation } from '../lib/supabase';
import type { AnalyticsSummary } from '../types/analytics';
import type { FinanceTransaction, Period, PeriodPreset } from '../types/finance';

interface PropertyRow {
  id: string;
  name: string;
  host_id: string;
}

type ReservationRow = Pick<
  Reservation,
  'id' | 'property_id' | 'check_in_date' | 'check_out_date' | 'total_amount' | 'status' | 'external_source' | 'created_at'
>;

interface SupabaseErrorLike {
  message: string;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function shiftDateOnlyByMonths(value: string, months: number): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value.slice(0, 10);
  }

  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth() + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));

  return `${targetYear}-${pad2(targetMonth)}-${pad2(targetDay)}`;
}

function shiftPeriodByMonths(period: Period, months: number): Period {
  return {
    start: shiftDateOnlyByMonths(period.start, months),
    end: shiftDateOnlyByMonths(period.end, months),
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof (error as SupabaseErrorLike).message === 'string'
  ) {
    return (error as SupabaseErrorLike).message;
  }

  return fr.errors.generic;
}

function inflateProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    host_id: row.host_id,
    name: row.name,
    address: '',
    city: '',
    postal_code: undefined,
    country: '',
    description: undefined,
    rooms_count: 0,
    bathrooms_count: 0,
    max_guests: 0,
    amenities: [],
    check_in_time: undefined,
    check_out_time: undefined,
    verification_mode: 'simple',
    auto_link_active: false,
    auto_link_regenerated_at: null,
    base_nightly_rate: null,
    pricing_currency: 'EUR',
    image_url: undefined,
    created_at: '',
    updated_at: '',
  };
}

function inflateReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    property_id: row.property_id,
    guest_id: null,
    check_in_date: row.check_in_date,
    check_out_date: row.check_out_date,
    number_of_guests: 0,
    booking_reference: '',
    unique_link: '',
    status: row.status,
    total_amount: row.total_amount == null ? null : Number(row.total_amount),
    verification_type: 'simple',
    verification_mode: 'simple',
    smart_lock_code: null,
    guest_rating: undefined,
    cancelled_at: undefined,
    notes: null,
    external_source: row.external_source ?? null,
    external_uid: null,
    external_feed_id: null,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

function normalizeTransaction(row: FinanceTransaction): FinanceTransaction {
  return {
    ...row,
    amount: Number(row.amount),
  };
}

export interface AnalyticsFilters {
  preset: PeriodPreset;
  customPeriod?: Period;
  propertyFilter: string | 'all';
}

export interface UseAnalyticsResult {
  summary: AnalyticsSummary | null;
  period: Period;
  properties: Property[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  exportCsv: () => void;
}

export function useAnalytics(hostId: string, filters: AnalyticsFilters): UseAnalyticsResult {
  const period = useMemo(
    () => resolvePeriod(filters.preset, filters.customPeriod),
    [filters.customPeriod, filters.preset],
  );
  const previousPeriod = useMemo(() => shiftPeriodByMonths(period, -12), [period]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!hostId) {
      setSummary(null);
      setProperties([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);

    try {
      const [propertiesResult, transactionsResult] = await Promise.all([
        supabase
          .from('properties')
          .select('id, name, host_id')
          .eq('host_id', hostId)
          .order('name', { ascending: true }),
        supabase
          .from('finance_transactions')
          .select('*')
          .eq('host_id', hostId)
          .gte('occurred_on', previousPeriod.start)
          .lte('occurred_on', period.end)
          .order('occurred_on', { ascending: false }),
      ]);

      if (propertiesResult.error) throw propertiesResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      const propertyRows = (propertiesResult.data ?? []) as PropertyRow[];
      const inflatedProperties = propertyRows.map(inflateProperty);
      const propertyIds = propertyRows.map((property) => property.id);
      const selectedPropertyIds =
        filters.propertyFilter === 'all'
          ? propertyIds
          : propertyIds.filter((propertyId) => propertyId === filters.propertyFilter);

      const emptyReservationResponse = { data: [] as ReservationRow[], error: null };
      const [reservationsResult, reservationsPrevResult] = selectedPropertyIds.length > 0
        ? await Promise.all([
          supabase
            .from('reservations')
            .select('id, property_id, check_in_date, check_out_date, total_amount, status, external_source, created_at')
            .in('property_id', selectedPropertyIds)
            .gte('check_in_date', period.start)
            .lte('check_in_date', period.end)
            .order('check_in_date', { ascending: true }),
          supabase
            .from('reservations')
            .select('id, property_id, check_in_date, check_out_date, total_amount, status, external_source, created_at')
            .in('property_id', selectedPropertyIds)
            .gte('check_in_date', previousPeriod.start)
            .lte('check_in_date', previousPeriod.end)
            .order('check_in_date', { ascending: true }),
        ])
        : [emptyReservationResponse, emptyReservationResponse];

      if (reservationsResult.error) throw reservationsResult.error;
      if (reservationsPrevResult.error) throw reservationsPrevResult.error;

      const reservations = (reservationsResult.data ?? []).map(inflateReservation);
      const reservationsPrev = (reservationsPrevResult.data ?? []).map(inflateReservation);
      const transactions = (transactionsResult.data ?? []).map(normalizeTransaction);
      const hasData = reservations.length > 0 || reservationsPrev.length > 0 || transactions.length > 0;

      setProperties(inflatedProperties);
      setSummary(
        hasData
          ? computeAnalyticsSummary({
            reservations,
            reservationsPrev,
            transactions,
            properties: inflatedProperties,
            period,
            propertyFilter: filters.propertyFilter,
          })
          : null,
      );
      setError(null);
    } catch (fetchError) {
      console.error('[useAnalytics] Failed to load analytics:', fetchError);
      setError(toErrorMessage(fetchError));
      setSummary(null);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [filters.propertyFilter, hostId, period, previousPeriod]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    void fetchData();
  }, [fetchData]);

  const exportCsv = useCallback(() => {
    if (!summary) return;

    const csv = exportAnalyticsCsv(summary.revenueTrend);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `analytics-${period.start}-${period.end}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [period.end, period.start, summary]);

  return {
    summary,
    period,
    properties,
    loading,
    error,
    refresh,
    exportCsv,
  };
}
