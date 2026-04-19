import { useCallback, useEffect, useMemo, useState } from 'react';
import { Property, Reservation, supabase } from '../lib/supabase';

interface VerificationSignal {
  status: 'approved' | 'pending' | 'rejected' | 'missing';
  at: string | null;
}

interface ContractSignal {
  signed: boolean;
  at: string | null;
}

interface DashboardRemotePayload {
  guestNameById: Record<string, string>;
  verificationByReservationId: Record<string, VerificationSignal>;
  contractByReservationId: Record<string, ContractSignal>;
}

export interface DashboardReservationContext {
  reservation: Reservation;
  guestName: string;
  propertyName: string;
  verification: VerificationSignal;
  contract: ContractSignal;
  hasPendingDeposit: boolean;
}

interface UseDashboardSignalsParams {
  reservations: Reservation[];
  properties: Property[];
}

const CACHE_TTL_MS = 30_000;
// Cache ciblé de type SWR: seule la fenêtre de réservations visibles est revalidée.
const payloadCache = new Map<string, { payload: DashboardRemotePayload; fetchedAt: number }>();
const inflightByKey = new Map<string, Promise<DashboardRemotePayload>>();

function buildKey(reservations: Reservation[]): string {
  if (reservations.length === 0) return 'dashboard-signals:empty';
  const ids = reservations.map((reservation) => reservation.id).sort();
  return `dashboard-signals:${ids.join(',')}`;
}

function hasPendingDeposit(notes?: string | null): boolean {
  if (!notes) return false;
  const normalized = notes.toLowerCase();
  return /deposit[_ -]?pending|depot[_ -]?(pending|non verse|non versé)|caution[_ -]?pending/.test(normalized);
}

async function fetchDashboardPayload(reservations: Reservation[]): Promise<DashboardRemotePayload> {
  if (reservations.length === 0) {
    return {
      guestNameById: {},
      verificationByReservationId: {},
      contractByReservationId: {},
    };
  }

  const reservationIds = reservations.map((reservation) => reservation.id);
  const guestIds = Array.from(new Set(reservations.map((reservation) => reservation.guest_id)));

  const [guestsResponse, verificationResponse, contractsResponse] = await Promise.all([
    supabase
      .from('guests')
      .select('id, full_name')
      .in('id', guestIds),
    supabase
      .from('identity_verification')
      .select('reservation_id, status, verified_at, created_at')
      .in('reservation_id', reservationIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('contracts')
      .select('reservation_id, signed_by_guest, signed_at, created_at')
      .in('reservation_id', reservationIds)
      .order('created_at', { ascending: false }),
  ]);

  if (guestsResponse.error || verificationResponse.error || contractsResponse.error) {
    throw new Error('Impossible de charger les signaux du tableau de bord.');
  }

  const guestNameById: Record<string, string> = {};
  (guestsResponse.data || []).forEach((guest) => {
    guestNameById[guest.id] = guest.full_name || 'Voyageur';
  });

  const verificationByReservationId: Record<string, VerificationSignal> = {};
  (verificationResponse.data || []).forEach((verification) => {
    if (verificationByReservationId[verification.reservation_id]) return;
    verificationByReservationId[verification.reservation_id] = {
      status: (verification.status as VerificationSignal['status']) || 'missing',
      at: verification.verified_at || verification.created_at || null,
    };
  });

  const contractByReservationId: Record<string, ContractSignal> = {};
  (contractsResponse.data || []).forEach((contract) => {
    if (contractByReservationId[contract.reservation_id]) return;
    contractByReservationId[contract.reservation_id] = {
      signed: Boolean(contract.signed_by_guest),
      at: contract.signed_at || contract.created_at || null,
    };
  });

  return {
    guestNameById,
    verificationByReservationId,
    contractByReservationId,
  };
}

export function useDashboardSignals({ reservations, properties }: UseDashboardSignalsParams) {
  const [payload, setPayload] = useState<DashboardRemotePayload>({
    guestNameById: {},
    verificationByReservationId: {},
    contractByReservationId: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = useMemo(() => buildKey(reservations), [reservations]);

  const revalidate = useCallback(async () => {
    const currentCache = payloadCache.get(key);
    if (currentCache && Date.now() - currentCache.fetchedAt < CACHE_TTL_MS) {
      setPayload(currentCache.payload);
      setLoading(false);
      return;
    }

    const inFlight = inflightByKey.get(key);
    if (inFlight) {
      setLoading(true);
      try {
        const nextPayload = await inFlight;
        setPayload(nextPayload);
        setError(null);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Erreur de chargement du dashboard.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const request = fetchDashboardPayload(reservations);
    inflightByKey.set(key, request);
    setLoading(true);

    try {
      const nextPayload = await request;
      payloadCache.set(key, { payload: nextPayload, fetchedAt: Date.now() });
      setPayload(nextPayload);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Erreur de chargement du dashboard.');
    } finally {
      inflightByKey.delete(key);
      setLoading(false);
    }
  }, [key, reservations]);

  useEffect(() => {
    void revalidate();
  }, [revalidate]);

  useEffect(() => {
    const onFocus = () => {
      void revalidate();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [revalidate]);

  const contextByReservationId = useMemo(() => {
    const propertyNameById = new Map(properties.map((property) => [property.id, property.name]));

    return reservations.map<DashboardReservationContext>((reservation) => {
      const verification = payload.verificationByReservationId[reservation.id] || {
        status: 'missing',
        at: null,
      };
      const contract = payload.contractByReservationId[reservation.id] || {
        signed: false,
        at: null,
      };

      return {
        reservation,
        guestName: payload.guestNameById[reservation.guest_id] || 'Voyageur',
        propertyName: propertyNameById.get(reservation.property_id) || 'Logement',
        verification,
        contract,
        hasPendingDeposit: hasPendingDeposit(reservation.notes),
      };
    });
  }, [payload, properties, reservations]);

  return {
    loading,
    error,
    reservationsContext: contextByReservationId,
    revalidate,
  };
}
