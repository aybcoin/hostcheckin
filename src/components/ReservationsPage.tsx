/**
 * ReservationsPage.tsx — Refonte V3
 * ────────────────────────────────────
 * En-tête : 4 chips de filtre rapide + recherche par nom/logement.
 * Corps    : cartes de réservation avec pastilles de statut et CTA contextuel.
 * Tri      : par priorité (to_handle > in_progress > upcoming > past),
 *            puis par date d'arrivée la plus proche.
 * Pagination: "charger plus" par tranches de PAGE_SIZE (pas de fetch N+1 —
 *             les données sont déjà en mémoire).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Plus, Search, X } from 'lucide-react';
import { clsx } from '../lib/clsx';
import {
  Reservation, Property, ReservationCreateInput, supabase,
} from '../lib/supabase';
import {
  computeReservationSteps,
  computeReservationCta,
  getReservationCategory,
  compareByPriority,
  type ReservationCategory,
  type VerificationSummary,
  type ContractSummary,
} from '../lib/reservations-status';
import { computeTrustMetrics } from '../lib/trust-metrics';
import {
  ReservationCard,
  type GuestInfo,
  type VerificationInfo,
  type ContractInfo,
} from './reservations/ReservationCard';
import { TrustBar } from './trust/TrustBar';
import { ReservationDocuments } from './ReservationDocuments';
import { ShareLinkModal } from './reservations/ShareLinkModal';
import { RatingModal } from './reservations/RatingModal';
import { CreateReservationModal } from './reservations/CreateReservationModal';
import { Button } from './ui/Button';
import { fr } from '../lib/i18n/fr';
import { borderTokens, chipTokens, inputTokens, stateFillTokens, textTokens } from '../lib/design-tokens';
import { toast } from '../lib/toast';

// ── Constantes ────────────────────────────────────────────────────────────────

/** Nombre de cartes rendues par "page" (load-more). */
const PAGE_SIZE = 20;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReservationsPageProps {
  reservations: Reservation[];
  properties: Property[];
  focusedReservationId?: string | null;
  onUpdate: (
    id: string,
    updates: Partial<Reservation>
  ) => Promise<{ error: { message: string } | null }>;
  onAdd: (
    reservation: ReservationCreateInput
  ) => Promise<{
    data: Reservation[] | null;
    error: { message: string; details?: string; hint?: string; code?: string } | null;
  }>;
  onDelete: (id: string) => Promise<{ error: { message: string } | null }>;
}

/** Paire (chip label, valeur de filtre). */
interface QuickFilter {
  label: string;
  value: ReservationCategory | 'all';
  count?: number;
}

interface GuestTokenRecord {
  token: string;
}

// ── Chips de filtre rapide ────────────────────────────────────────────────────

function QuickFilterChips({
  chips,
  active,
  onChange,
}: {
  chips: QuickFilter[];
  active: ReservationCategory | 'all';
  onChange: (v: ReservationCategory | 'all') => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Filtre rapide des réservations"
    >
      {chips.map((chip) => {
        const isActive = chip.value === active;
        return (
          <button
            key={chip.value}
            type="button"
            onClick={() => onChange(chip.value)}
            aria-pressed={isActive}
            className={`
              inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5
              text-sm font-medium transition-colors
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-slate-400 focus-visible:ring-offset-1
              ${isActive ? chipTokens.active : chipTokens.primary}
            `}
          >
            {chip.label}
            {chip.count !== undefined && (
                <span
                  aria-label={`${chip.count} réservations`}
                  className={clsx(
                    'inline-flex items-center justify-center rounded-full min-w-[1.25rem] h-5 px-1 text-xs font-semibold',
                    isActive ? 'bg-white/25 text-white' : clsx(stateFillTokens.neutral, textTokens.body),
                  )}
                >
                  {chip.count}
                </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

export function ReservationsPage({
  reservations,
  properties,
  focusedReservationId = null,
  onUpdate,
  onAdd,
  onDelete,
}: ReservationsPageProps) {
  // ── État UI ───────────────────────────────────────────────────────────────
  const [quickFilter, setQuickFilter] = useState<ReservationCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingDocuments, setViewingDocuments] = useState<{ id: string; ref: string } | null>(null);
  const [shareModal, setShareModal] = useState<{ link: string; guestName: string; propertyName: string } | null>(null);
  const [ratingModal, setRatingModal] = useState<{ id: string; ref: string; rating?: number } | null>(null);

  // ── Données secondaires (batch-load sans N+1) ─────────────────────────────
  const [guests, setGuests] = useState<Record<string, GuestInfo>>({});
  const [verifications, setVerifications] = useState<Record<string, VerificationInfo>>({});
  const [contracts, setContracts] = useState<Record<string, ContractInfo>>({});

  const fetchSecondaryData = useCallback(async () => {
    if (reservations.length === 0) return;
    const guestIds = [...new Set(reservations.map((r) => r.guest_id))];
    const resIds = reservations.map((r) => r.id);

    const [guestRes, verRes, contractRes] = await Promise.all([
      supabase.from('guests').select('id, full_name, email, phone').in('id', guestIds),
      supabase
        .from('identity_verification')
        .select('id, reservation_id, status, id_type, id_document_url, id_back_url, selfie_url, document_confidence, detected_document_type, rejection_reason, verified_at')
        .in('reservation_id', resIds)
        .order('created_at', { ascending: true }),
      supabase
        .from('contracts')
        .select('id, reservation_id, signed_by_guest, guest_signature_url, contract_content, pdf_storage_path, signed_at')
        .in('reservation_id', resIds)
        .order('created_at', { ascending: true }),
    ]);

    if (guestRes.error) console.error('[ReservationsPage] guests:', guestRes.error);
    if (verRes.error) console.error('[ReservationsPage] verifications:', verRes.error);
    if (contractRes.error) console.error('[ReservationsPage] contracts:', contractRes.error);

    if (guestRes.data) {
      const map: Record<string, GuestInfo> = {};
      (guestRes.data as GuestInfo[]).forEach((g) => { map[g.id] = g; });
      setGuests(map);
    }
    if (verRes.data) {
      const map: Record<string, VerificationInfo> = {};
      (verRes.data as VerificationInfo[]).forEach((v) => { map[v.reservation_id] = v; });
      setVerifications(map);
    }
    if (contractRes.data) {
      const map: Record<string, ContractInfo> = {};
      (contractRes.data as ContractInfo[]).forEach((c) => { map[c.reservation_id] = c; });
      setContracts(map);
    }
  }, [reservations]);

  useEffect(() => { void fetchSecondaryData(); }, [fetchSecondaryData]);

  // ── Focus depuis navigation externe ──────────────────────────────────────
  useEffect(() => {
    if (!focusedReservationId) return;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-testid="reservation-card-${focusedReservationId}"]`
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [focusedReservationId]);

  // ── Calcul des métadonnées enrichies (mémoïsé) ───────────────────────────
  const now = useMemo(() => new Date(), []);

  const enriched = useMemo(() => {
    return reservations.map((r) => {
      const rawVer = verifications[r.id];
      const rawCon = contracts[r.id];

      const verSummary: VerificationSummary | undefined = rawVer
        ? {
            status: rawVer.status as VerificationSummary['status'],
            verified_at: (rawVer as VerificationInfo & { verified_at?: string }).verified_at,
          }
        : undefined;

      const contractSummary: ContractSummary | undefined = rawCon
        ? { signed_by_guest: rawCon.signed_by_guest, signed_at: rawCon.signed_at }
        : undefined;

      const steps = computeReservationSteps(r, verSummary, contractSummary, now);
      const category = getReservationCategory(r, steps, now);
      const cta = computeReservationCta(r, steps);

      return { reservation: r, steps, category, cta };
    });
  }, [reservations, verifications, contracts, now]);

  // ── Comptages par catégorie ───────────────────────────────────────────────
  const categoryCounts = useMemo(
    () =>
      enriched.reduce<Record<ReservationCategory, number>>(
        (acc, item) => { acc[item.category] = (acc[item.category] ?? 0) + 1; return acc; },
        { to_handle: 0, upcoming: 0, in_progress: 0, past: 0 }
      ),
    [enriched]
  );

  const chips: QuickFilter[] = [
    { label: 'Toutes', value: 'all', count: reservations.length },
    { label: 'À traiter', value: 'to_handle', count: categoryCounts.to_handle },
    { label: 'À venir', value: 'upcoming', count: categoryCounts.upcoming },
    { label: 'En cours', value: 'in_progress', count: categoryCounts.in_progress },
    { label: 'Passées', value: 'past', count: categoryCounts.past },
  ];

  const trustMetrics = useMemo(() => {
    const contractSummaries: ContractSummary[] = Object.values(contracts).map((contract) => ({
      signed_by_guest: contract.signed_by_guest,
      signed_at: contract.signed_at,
    }));

    const verificationSummaries: VerificationSummary[] = Object.values(verifications).map((verification) => ({
      status: (verification.status as VerificationSummary['status']) ?? 'pending',
      verified_at: (verification as VerificationInfo & { verified_at?: string }).verified_at,
    }));

    return computeTrustMetrics(reservations, contractSummaries, verificationSummaries, 30);
  }, [contracts, reservations, verifications]);

  // ── Filtrage + tri ────────────────────────────────────────────────────────
  const searchLower = search.toLowerCase().trim();

  const filtered = useMemo(() => {
    const result = enriched.filter((item) => {
      if (quickFilter !== 'all' && item.category !== quickFilter) return false;
      if (searchLower) {
        const guest = guests[item.reservation.guest_id];
        const property = properties.find((p) => p.id === item.reservation.property_id);
        const haystack = [
          guest?.full_name ?? '',
          guest?.email ?? '',
          property?.name ?? '',
          item.reservation.booking_reference,
        ].join(' ').toLowerCase();
        if (!haystack.includes(searchLower)) return false;
      }
      return true;
    });
    return [...result].sort(compareByPriority);
  }, [enriched, quickFilter, searchLower, guests, properties]);

  // Reset pagination au changement de filtre/recherche
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [quickFilter, search]);

  const visibleItems = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (id: string) => { await onDelete(id); },
    [onDelete]
  );

  const handleBlacklist = useCallback(
    async (reservation: Reservation, guest: GuestInfo | undefined) => {
      if (!guest) return;
      const property = properties.find((p) => p.id === reservation.property_id);
      if (!property?.host_id) { alert(fr.reservations.blacklistMissingHostAlert); return; }
      const reason = window.prompt(
        fr.reservations.blacklistReasonPrompt,
        fr.reservations.blacklistReasonDefault
      );
      if (!reason?.trim()) return;
      const { error } = await supabase.from('blacklisted_guests').insert({
        host_id: property.host_id,
        full_name: guest.full_name,
        email: guest.email ?? null,
        phone: guest.phone ?? null,
        reason: reason.trim(),
      });
      alert(error ? fr.reservations.blacklistAddFailed : fr.reservations.blacklistAddSuccess);
    },
    [properties]
  );

  const handleRate = async (rating: number) => {
    if (!ratingModal) return;
    await onUpdate(ratingModal.id, { guest_rating: rating });
    setRatingModal(null);
  };

  const handleCopyGuestPortalLink = useCallback(async (reservation: Reservation) => {
    try {
      const nowIso = new Date().toISOString();

      const { data: existingToken, error: findError } = await supabase
        .from('guest_tokens')
        .select('token')
        .eq('reservation_id', reservation.id)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) {
        toast.error(fr.reservations.guestPortalLinkError);
        return;
      }

      const token = (existingToken as GuestTokenRecord | null)?.token;

      if (token) {
        await navigator.clipboard.writeText(`${window.location.origin}/check-in/${token}`);
        toast.success(fr.reservations.guestPortalLinkCopied);
        return;
      }

      const { data: insertedToken, error: insertError } = await supabase
        .from('guest_tokens')
        .insert({ reservation_id: reservation.id })
        .select('token')
        .single();

      if (insertError || !insertedToken) {
        toast.error(fr.reservations.guestPortalLinkError);
        return;
      }

      const createdToken = (insertedToken as GuestTokenRecord).token;
      await navigator.clipboard.writeText(`${window.location.origin}/check-in/${createdToken}`);
      toast.success(fr.reservations.guestPortalLinkCopied);
    } catch {
      toast.error(fr.reservations.guestPortalLinkError);
    }
  }, []);

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={clsx('text-2xl sm:text-3xl font-bold', textTokens.title)}>
            {fr.reservations.title}
          </h1>
          <div className="mt-3">
            <TrustBar metrics={trustMetrics} />
          </div>
          <p className={clsx('mt-1 text-sm', textTokens.subtle)}>
            {fr.reservations.totalCount(reservations.length)}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreateModal(true)}
          aria-label={fr.reservations.newReservation}
        >
          <Plus size={16} aria-hidden="true" />
          {fr.reservations.newReservation}
        </Button>
      </div>

      {/* Chips + barre de recherche */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <QuickFilterChips chips={chips} active={quickFilter} onChange={setQuickFilter} />
        <div className="relative w-full sm:w-64">
          <Search
            size={15}
            className={clsx('absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none', textTokens.subtle)}
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Voyageur, logement…"
            aria-label="Rechercher une réservation"
            className={clsx(inputTokens.base, 'py-2 pl-8 pr-8')}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Effacer la recherche"
              className={clsx('absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 hover:opacity-90', textTokens.subtle)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className={clsx('rounded-xl border bg-white p-6 sm:p-12 text-center shadow-sm', borderTokens.default)}>
            <Calendar className={clsx('w-10 h-10 mx-auto mb-3', textTokens.subtle)} aria-hidden="true" />
            <p className={clsx('font-medium', textTokens.subtle)}>
              {search
                ? 'Aucun résultat pour cette recherche'
                : quickFilter === 'to_handle'
                ? 'Aucune réservation à traiter'
                : quickFilter === 'upcoming'
                ? 'Aucune réservation à venir'
                : quickFilter === 'in_progress'
                ? 'Aucune réservation en cours'
                : quickFilter === 'past'
                ? 'Aucune réservation passée'
                : fr.reservations.empty}
            </p>
          </div>
        ) : (
          <>
            {visibleItems.map(({ reservation, steps, cta }) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                property={properties.find((p) => p.id === reservation.property_id)}
                guest={guests[reservation.guest_id]}
                verification={verifications[reservation.id]}
                contract={contracts[reservation.id]}
                steps={steps}
                cta={cta}
                initiallyExpanded={focusedReservationId === reservation.id}
                onUpdate={onUpdate}
                onDelete={handleDelete}
                onBlacklist={handleBlacklist}
                onOpenDocuments={(id, ref) => setViewingDocuments({ id, ref })}
                onOpenShare={(link, guestName, propertyName) =>
                  setShareModal({ link, guestName, propertyName })
                }
                onCopyGuestPortalLink={handleCopyGuestPortalLink}
                onOpenRating={(id, ref, rating) => setRatingModal({ id, ref, rating })}
              />
            ))}

            {/* Compteur + load-more */}
            <div className="flex items-center justify-between pt-1">
              <p className={clsx('text-xs', textTokens.subtle)} aria-live="polite">
                {Math.min(visibleCount, filtered.length)} / {filtered.length}{' '}
                réservation{filtered.length > 1 ? 's' : ''}
              </p>
              {hasMore && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                >
                  Charger {Math.min(PAGE_SIZE, filtered.length - visibleCount)} de plus
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modales */}
      {showCreateModal && (
        <CreateReservationModal
          properties={properties}
          onAdd={onAdd}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      {viewingDocuments && (
        <ReservationDocuments
          reservationId={viewingDocuments.id}
          bookingReference={viewingDocuments.ref}
          onClose={() => setViewingDocuments(null)}
        />
      )}
      {shareModal && (
        <ShareLinkModal
          link={shareModal.link}
          guestName={shareModal.guestName}
          propertyName={shareModal.propertyName}
          onClose={() => setShareModal(null)}
        />
      )}
      {ratingModal && (
        <RatingModal
          bookingReference={ratingModal.ref}
          currentRating={ratingModal.rating}
          onSave={handleRate}
          onClose={() => setRatingModal(null)}
        />
      )}
    </div>
  );
}
