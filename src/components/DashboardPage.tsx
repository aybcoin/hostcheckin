import { useMemo } from 'react';
import type { ContractSummary, VerificationSummary } from '../lib/reservations-status';
import type { Host, Property, Reservation } from '../lib/supabase';
import { clsx } from '../lib/clsx';
import { computeActivityTimeline, computeTodayItems, computeWeekItems } from '../lib/dashboard-data';
import { borderTokens, surfaceTokens, textTokens } from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { computeTrustMetrics } from '../lib/trust-metrics';
import { useDashboardSignals } from '../hooks/useDashboardSignals';
import { ActivityTimeline } from './dashboard/ActivityTimeline';
import { TodaySection } from './dashboard/TodaySection';
import { WeekSection } from './dashboard/WeekSection';
import { TrustBar } from './trust/TrustBar';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';

/**
 * Dashboard V2 — logique de priorisation
 * 1) Aujourd'hui : urgences opérationnelles immédiates (arrivées/départs/actions critiques), max 5.
 * 2) Cette semaine : J+1..J+7, uniquement les réservations qui demandent une action hôte.
 * 3) Activité récente : timeline condensée (10 événements), sans widgets décoratifs.
 * Les trois zones réutilisent les mêmes données enrichies en mémoire pour éviter tout N+1.
 */
interface DashboardPageProps {
  host: Host | null;
  properties: Property[];
  reservations: Reservation[];
  loading: boolean;
  onOpenReservation: (reservationId: string) => void;
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

export function DashboardPage({
  host,
  properties,
  reservations,
  loading,
  onOpenReservation,
}: DashboardPageProps) {
  const {
    loading: signalsLoading,
    reservationsContext,
  } = useDashboardSignals({ reservations, properties });

  const propertyById = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties],
  );

  const contextByReservationId = useMemo(
    () => new Map(reservationsContext.map((context) => [context.reservation.id, context])),
    [reservationsContext],
  );

  // Données enrichies en mémoire (aucune requête supplémentaire).
  const decoratedReservations = useMemo<DecoratedReservation[]>(
    () =>
      reservations.map((reservation) => {
        const context = contextByReservationId.get(reservation.id);
        const property = propertyById.get(reservation.property_id);
        return {
          ...reservation,
          guest_name: context?.guestName,
          property_name: context?.propertyName || property?.name,
          check_in_time: property?.check_in_time,
          check_out_time: property?.check_out_time,
          verification_status: context?.verification.status,
          contract_signed: context?.contract.signed,
          has_pending_deposit: context?.hasPendingDeposit,
        };
      }),
    [contextByReservationId, propertyById, reservations],
  );

  const todayItems = useMemo(
    () => computeTodayItems(decoratedReservations),
    [decoratedReservations],
  );

  const weekItems = useMemo(
    () => computeWeekItems(decoratedReservations),
    [decoratedReservations],
  );

  const trustMetrics = useMemo(() => {
    const contracts: ContractSummary[] = reservationsContext.map((context) => ({
      signed_by_guest: context.contract.signed,
      signed_at: context.contract.at ?? undefined,
    }));

    const verifications: VerificationSummary[] = reservationsContext.map((context) => ({
      status: context.verification.status === 'missing'
        ? 'pending'
        : context.verification.status,
      verified_at: context.verification.at ?? undefined,
    }));

    return computeTrustMetrics(reservations, contracts, verifications, 30);
  }, [reservations, reservationsContext]);

  const activityContracts = useMemo<ContractSummary[]>(() => {
    return reservationsContext.map((context, index) => ({
      signed_by_guest: context.contract.signed,
      signed_at: context.contract.at || undefined,
      // Métadonnées optionnelles pour enrichir le message timeline.
      id: `contract-${index}-${context.reservation.id}`,
      guestName: context.guestName,
      propertyName: context.propertyName,
      created_at: context.reservation.updated_at,
    })) as ContractSummary[];
  }, [reservationsContext]);

  const activityVerifications = useMemo<VerificationSummary[]>(() => {
    return reservationsContext.map((context, index) => ({
      status: context.verification.status === 'missing'
        ? 'pending'
        : context.verification.status,
      verified_at: context.verification.at || undefined,
      id: `verification-${index}-${context.reservation.id}`,
      guestName: context.guestName,
      propertyName: context.propertyName,
      created_at: context.reservation.updated_at,
    })) as VerificationSummary[];
  }, [reservationsContext]);

  const activityAuxEvents = useMemo(
    () =>
      decoratedReservations.flatMap((reservation) => {
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
        const propertyName = reservation.property_name || fr.reservations.unknownProperty;

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
            secured_at: reservation.deposit_secured_at,
            status: reservation.deposit_status,
            guestName,
            propertyName,
          });
        }

        return events;
      }),
    [decoratedReservations],
  );

  const activityTimeline = useMemo(
    () =>
      computeActivityTimeline(
        activityContracts,
        activityVerifications,
        activityAuxEvents,
        10,
      ),
    [activityAuxEvents, activityContracts, activityVerifications],
  );

  const handleAction = (itemId: string) => {
    onOpenReservation(itemId);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <TrustBar metrics={trustMetrics} />
        <div>
          <h1 className={clsx('text-2xl font-bold sm:text-3xl', textTokens.title)}>{fr.dashboard.title}</h1>
          <p className={clsx('mt-1 text-sm sm:text-base', textTokens.muted)}>
            {fr.dashboard.subtitle(host?.full_name || fr.app.hostFallbackName)}
          </p>
        </div>
      </header>

      {signalsLoading ? (
        <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default, surfaceTokens.panel)}>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </Card>
      ) : (
        <>
          <TodaySection items={todayItems} onAction={handleAction} />
          <WeekSection items={weekItems} onAction={handleAction} />
          <ActivityTimeline events={activityTimeline} />
        </>
      )}
    </div>
  );
}
