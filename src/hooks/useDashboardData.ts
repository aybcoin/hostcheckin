import { useCallback, useEffect, useState } from 'react';
import {
  computeActivityTimeline,
  computeTodayItems,
  computeWeekItems,
  type ActivityEvent,
  type TodayItem,
  type WeekItem,
} from '../lib/dashboard-data';
import { fr } from '../lib/i18n/fr';
import type { ContractSummary, VerificationSummary } from '../lib/reservations-status';
import { type Reservation, supabase } from '../lib/supabase';
import { computeTrustMetrics, type TrustMetrics } from '../lib/trust-metrics';

interface DashboardReservationRow extends Reservation {
  properties?: { name?: string | null } | Array<{ name?: string | null }> | null;
  guests?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
  contracts?: Array<Record<string, unknown>> | null;
  verifications?: Array<Record<string, unknown>> | null;
  identity_verification?: Array<Record<string, unknown>> | null;
  checkin_date?: string;
  checkout_date?: string;
}

type DecoratedReservation = Reservation & {
  guest_name?: string;
  property_name?: string;
  check_in_time?: string;
  check_out_time?: string;
  verification_status?: string;
  contract_signed?: boolean;
  has_pending_deposit?: boolean;
  deposit_status?: string;
  deposit_secured_at?: string;
};

const EMPTY_TRUST_METRICS: TrustMetrics = {
  signatures: 0,
  identities: 0,
  deposits: 0,
  windowDays: 30,
};

function toSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function extractReservationDates(row: Record<string, unknown>): {
  checkInDate: string;
  checkOutDate: string;
} {
  const checkInDate =
    typeof row.check_in_date === 'string'
      ? row.check_in_date
      : typeof row.checkin_date === 'string'
        ? row.checkin_date
        : '';

  const checkOutDate =
    typeof row.check_out_date === 'string'
      ? row.check_out_date
      : typeof row.checkout_date === 'string'
        ? row.checkout_date
        : '';

  return { checkInDate, checkOutDate };
}

function normalizeVerificationStatus(value: unknown): VerificationSummary['status'] {
  const status = typeof value === 'string' ? value.toLowerCase() : '';
  if (status === 'approved' || status === 'verified' || status === 'ok') return 'approved';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

function hasPendingDepositSignal(reservation: Reservation): boolean {
  const row = reservation as unknown as Record<string, unknown>;
  const status =
    typeof row.deposit_status === 'string'
      ? row.deposit_status.toLowerCase()
      : typeof row.caution_status === 'string'
        ? row.caution_status.toLowerCase()
        : null;

  if (status) {
    return ['pending', 'required', 'awaiting', 'unpaid'].includes(status);
  }

  const notes = typeof reservation.notes === 'string' ? reservation.notes.toLowerCase() : '';
  return /deposit[_ -]?pending|depot[_ -]?(pending|non verse|non versé)|caution[_ -]?pending/.test(notes);
}

export interface DashboardData {
  todayItems: TodayItem[];
  weekItems: WeekItem[];
  timeline: ActivityEvent[];
  trustMetrics: TrustMetrics;
  isLoading: boolean;
  error: string | null;
  isRealtimeActive: boolean;
  isRealtimeReconnecting: boolean;
  refresh: () => void;
}

interface ComputedDashboardPayload {
  todayItems: TodayItem[];
  weekItems: WeekItem[];
  timeline: ActivityEvent[];
  trustMetrics: TrustMetrics;
}

function computeDashboardPayload(rows: DashboardReservationRow[]): ComputedDashboardPayload {
  const baseReservations: Reservation[] = [];
  const decoratedReservations: DecoratedReservation[] = [];

  rows.forEach((row) => {
    const rawRow = row as unknown as Record<string, unknown>;
    const { checkInDate, checkOutDate } = extractReservationDates(rawRow);

    const reservation: Reservation = {
      ...row,
      check_in_date: checkInDate || row.check_in_date,
      check_out_date: checkOutDate || row.check_out_date,
    };

    const property = toSingleRelation(row.properties);
    const guest = toSingleRelation(row.guests);

    const verifications =
      row.verifications || row.identity_verification || [];

    const latestVerification = [...verifications].sort((left, right) => {
      const leftTimestamp = Date.parse(String(left.created_at || left.verified_at || ''));
      const rightTimestamp = Date.parse(String(right.created_at || right.verified_at || ''));
      return (Number.isNaN(rightTimestamp) ? 0 : rightTimestamp)
        - (Number.isNaN(leftTimestamp) ? 0 : leftTimestamp);
    })[0];

    const contracts = row.contracts || [];
    const signedByGuest = contracts.some((contract) => {
      if (contract.signed_by_guest === true) return true;
      return typeof contract.status === 'string' && contract.status.toLowerCase() === 'signed';
    });

    const dynamic = reservation as unknown as Record<string, unknown>;

    decoratedReservations.push({
      ...reservation,
      guest_name: typeof guest?.full_name === 'string' ? guest.full_name : undefined,
      property_name: typeof property?.name === 'string' ? property.name : undefined,
      verification_status: typeof latestVerification?.status === 'string'
        ? latestVerification.status
        : undefined,
      contract_signed: signedByGuest,
      has_pending_deposit: hasPendingDepositSignal(reservation),
      deposit_status: typeof dynamic.deposit_status === 'string' ? dynamic.deposit_status : undefined,
      deposit_secured_at:
        typeof dynamic.deposit_secured_at === 'string' ? dynamic.deposit_secured_at : undefined,
    });

    baseReservations.push(reservation);
  });

  const contractSummaries: ContractSummary[] = decoratedReservations.flatMap((reservation) => {
    const row = rows.find((item) => item.id === reservation.id);
    const contracts = row?.contracts || [];

    return contracts.map((contract, index) => ({
      signed_by_guest:
        contract.signed_by_guest === true
        || (typeof contract.status === 'string' && contract.status.toLowerCase() === 'signed'),
      signed_at:
        typeof contract.signed_at === 'string'
          ? contract.signed_at
          : typeof contract.created_at === 'string'
            ? contract.created_at
            : undefined,
      id: typeof contract.id === 'string' ? contract.id : `${reservation.id}:contract:${index}`,
      guestName: reservation.guest_name,
      propertyName: reservation.property_name,
      created_at:
        typeof contract.created_at === 'string' ? contract.created_at : reservation.updated_at,
    })) as ContractSummary[];
  });

  const verificationSummaries: VerificationSummary[] = decoratedReservations.flatMap((reservation) => {
    const row = rows.find((item) => item.id === reservation.id);
    const verifications = row?.verifications || row?.identity_verification || [];

    return verifications.map((verification, index) => ({
      status: normalizeVerificationStatus(verification.status),
      verified_at:
        typeof verification.verified_at === 'string'
          ? verification.verified_at
          : typeof verification.created_at === 'string'
            ? verification.created_at
            : undefined,
      id:
        typeof verification.id === 'string' ? verification.id : `${reservation.id}:verification:${index}`,
      guestName: reservation.guest_name,
      propertyName: reservation.property_name,
      created_at:
        typeof verification.created_at === 'string' ? verification.created_at : reservation.updated_at,
    })) as VerificationSummary[];
  });

  const timelineAuxEvents = decoratedReservations.flatMap((reservation) => {
    const events: Array<{
      id: string;
      event_type: 'checkin' | 'reservation' | 'deposit';
      created_at: string;
      guestName: string;
      propertyName: string;
      status?: string;
      secured_at?: string;
    }> = [];

    const guestName = reservation.guest_name || fr.app.guestFallbackName;
    const propertyName = reservation.property_name || fr.dashboard.common.propertyFallback;

    if (reservation.status === 'checked_in' || reservation.status === 'completed') {
      events.push({
        id: `${reservation.id}:checkin`,
        event_type: 'checkin',
        created_at: reservation.updated_at,
        guestName,
        propertyName,
      });
    }

    events.push({
      id: `${reservation.id}:reservation`,
      event_type: 'reservation',
      created_at: reservation.created_at,
      guestName,
      propertyName,
    });

    if (reservation.deposit_status === 'secured' || reservation.deposit_status === 'active') {
      events.push({
        id: `${reservation.id}:deposit`,
        event_type: 'deposit',
        created_at: reservation.updated_at,
        guestName,
        propertyName,
        status: reservation.deposit_status,
        secured_at: reservation.deposit_secured_at,
      });
    }

    return events;
  });

  return {
    todayItems: computeTodayItems(decoratedReservations),
    weekItems: computeWeekItems(decoratedReservations),
    timeline: computeActivityTimeline(contractSummaries, verificationSummaries, timelineAuxEvents, 10),
    trustMetrics: computeTrustMetrics(baseReservations, contractSummaries, verificationSummaries, 30),
  };
}

export function useDashboardData(propertyId?: string | null): DashboardData {
  const [todayItems, setTodayItems] = useState<TodayItem[]>([]);
  const [weekItems, setWeekItems] = useState<WeekItem[]>([]);
  const [timeline, setTimeline] = useState<ActivityEvent[]>([]);
  const [trustMetrics, setTrustMetrics] = useState<TrustMetrics>(EMPTY_TRUST_METRICS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [isRealtimeReconnecting, setIsRealtimeReconnecting] = useState(false);

  const fetchDashboardData = useCallback(async (showLoader: boolean) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      let query = supabase
        .from('reservations')
        .select('*, properties(name), guests(full_name), contracts(*), verifications:identity_verification(*)')
        .order('check_in_date', { ascending: true })
        .limit(50);

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      const rows = (data || []) as DashboardReservationRow[];
      const payload = computeDashboardPayload(rows);

      setTodayItems(payload.todayItems);
      setWeekItems(payload.weekItems);
      setTimeline(payload.timeline);
      setTrustMetrics(payload.trustMetrics);
      setError(null);
    } catch (fetchError) {
      console.error('[useDashboardData] Failed to load dashboard data:', fetchError);
      setError(fr.errors.dashboard);
      setTodayItems([]);
      setWeekItems([]);
      setTimeline([]);
      setTrustMetrics(EMPTY_TRUST_METRICS);
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, [propertyId]);

  const refresh = useCallback(() => {
    void fetchDashboardData(true);
  }, [fetchDashboardData]);

  useEffect(() => {
    void fetchDashboardData(true);
  }, [fetchDashboardData]);

  useEffect(() => {
    const channel = supabase
      .channel(`dashboard-reservations-live-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
        },
        () => {
          void fetchDashboardData(false);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
          setIsRealtimeReconnecting(false);
          return;
        }

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsRealtimeActive(false);
          setIsRealtimeReconnecting(true);
          return;
        }

        if (status === 'JOINED' || status === 'LEAVING') {
          setIsRealtimeReconnecting(true);
        }
      });

    return () => {
      setIsRealtimeActive(false);
      setIsRealtimeReconnecting(false);
      void supabase.removeChannel(channel);
    };
  }, [fetchDashboardData]);

  return {
    todayItems,
    weekItems,
    timeline,
    trustMetrics,
    isLoading,
    error,
    isRealtimeActive,
    isRealtimeReconnecting,
    refresh,
  };
}
