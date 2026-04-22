/**
 * reservations-status.ts
 * ──────────────────────
 * Calcul pur (sans dépendance React) des statuts de chaque étape
 * d'une réservation, de la catégorie de filtre rapide et du CTA contextuel.
 *
 * RÈGLES DE PRIORISATION
 * ──────────────────────
 * 1. "blocking" l'emporte sur tout autre état pour une étape.
 *    Exemples de blocages :
 *      - arrivée déjà passée, statut encore "pending" → Check-in bloquant
 *      - contrat non signé à J-2 ou J passé → Contrat bloquant
 *      - vérification rejetée → ID bloquant
 *
 * 2. Une réservation est "À traiter" si :
 *    a) au moins une étape est "blocking", OU
 *    b) l'arrivée est dans ≤ 48 h et au moins une étape est "pending".
 *
 * 3. Tri par défaut : "À traiter" > "En cours" > "À venir" > "Passées",
 *    puis par date d'arrivée la plus proche dans chaque catégorie.
 *
 * 4. CTA contextuel : une seule action prioritaire par carte.
 *    Ordre de priorité :
 *      1. ID rejeté (bloquant absolu)
 *      2. Arrivée passée sans check-in
 *      3. Contrat manquant urgent
 *      4. ID non fourni
 *      5. Tout bon, pending → Valider check-in
 *      6. checked_in → Marquer terminé
 *      7. Défaut → Voir les détails
 */

import type { Reservation } from './supabase';

// ── Types stricts ──────────────────────────────────────────────────────────────

export type StepStatus = 'ok' | 'pending' | 'blocking';

/** Représente l'état d'une étape du parcours de réservation. */
export interface ReservationStep {
  status: StepStatus;
  /** Label textuel complet pour l'accessibilité (ne pas s'appuyer uniquement sur la couleur). */
  label: string;
  /** Libellé court affiché dans la pastille. */
  shortLabel: string;
  /** ISO string de la date d'accomplissement (utilisé dans le tooltip). */
  completedAt?: string;
}

export interface ReservationSteps {
  checkin: ReservationStep;
  contrat: ReservationStep;
  identite: ReservationStep;
  depot: ReservationStep;
}

/** Les quatre catégories de filtre rapide. */
export type ReservationCategory = 'to_handle' | 'upcoming' | 'in_progress' | 'past';

/** Type des actions CTA possibles. */
export type CtaAction =
  | 'relancer_checkin'
  | 'voir_contrat'
  | 'demander_id'
  | 'valider_checkin'
  | 'marquer_termine'
  | 'contacter_invite'
  | 'voir_details';

export interface ReservationCta {
  action: CtaAction;
  label: string;
  variant: 'primary' | 'secondary' | 'dangerSoft';
}

// ── Types mini pour les données secondaires (non-Supabase typing) ──────────────

/** Sous-ensemble de identity_verification nécessaire au calcul. */
export interface VerificationSummary {
  status: 'pending' | 'approved' | 'rejected';
  verified_at?: string | null;
}

/** Sous-ensemble de contracts nécessaire au calcul. */
export interface ContractSummary {
  signed_by_guest: boolean;
  signed_at?: string | null;
}

// ── Constantes ─────────────────────────────────────────────────────────────────

/** Seuil d'arrivée imminente (en millisecondes). */
const IMMINENT_THRESHOLD_MS = 48 * 60 * 60 * 1000;

// ── Calcul des étapes ─────────────────────────────────────────────────────────

/**
 * Calcule les 4 étapes de statut pour une réservation.
 *
 * @param reservation  L'objet réservation de la DB.
 * @param verification La vérification d'identité associée (undefined si aucune).
 * @param contract     Le contrat associé (undefined si aucun).
 * @param now          Horloge (injectée pour faciliter les tests).
 */
export function computeReservationSteps(
  reservation: Reservation,
  verification: VerificationSummary | undefined,
  contract: ContractSummary | undefined,
  now: Date = new Date()
): ReservationSteps {
  const checkInMs = new Date(reservation.check_in_date).getTime();
  const nowMs = now.getTime();

  const isPast = checkInMs < nowMs;
  const isImminent = !isPast && checkInMs - nowMs <= IMMINENT_THRESHOLD_MS;
  const isCompleted =
    reservation.status === 'checked_in' ||
    reservation.status === 'checked_out' ||
    reservation.status === 'completed';
  const isCancelled = reservation.status === 'cancelled';
  const isPending = reservation.status === 'pending';

  // ── CHECK-IN ──────────────────────────────────────────────────────────────
  let checkinStatus: StepStatus;
  let checkinCompletedAt: string | undefined;

  if (isCancelled) {
    checkinStatus = 'pending';
  } else if (isCompleted) {
    checkinStatus = 'ok';
    checkinCompletedAt = reservation.updated_at;
  } else if (isPast && isPending) {
    // Arrivée déjà passée, pas encore effectuée → bloquant
    checkinStatus = 'blocking';
  } else {
    checkinStatus = 'pending';
  }

  // ── CONTRAT ───────────────────────────────────────────────────────────────
  let contratStatus: StepStatus;
  let contratCompletedAt: string | undefined;

  if (isCancelled) {
    contratStatus = 'pending';
  } else if (contract?.signed_by_guest) {
    contratStatus = 'ok';
    contratCompletedAt = contract.signed_at ?? undefined;
  } else if (isPast || isImminent) {
    // Arrivée passée ou imminente sans contrat → bloquant
    contratStatus = 'blocking';
  } else {
    contratStatus = 'pending';
  }

  // ── IDENTITÉ ──────────────────────────────────────────────────────────────
  let identiteStatus: StepStatus;
  let identiteCompletedAt: string | undefined;

  if (isCancelled) {
    identiteStatus = 'pending';
  } else if (verification?.status === 'approved') {
    identiteStatus = 'ok';
    identiteCompletedAt = verification.verified_at ?? undefined;
  } else if (verification?.status === 'rejected') {
    // Rejet de l'ID → toujours bloquant (nécessite intervention manuelle)
    identiteStatus = 'blocking';
  } else if (isPast || isImminent) {
    // Arrivée passée ou imminente sans vérification → bloquant
    identiteStatus = 'blocking';
  } else {
    identiteStatus = 'pending';
  }

  // ── DÉPÔT (non encore implémenté) ─────────────────────────────────────────
  // Toujours "pending" jusqu'à l'implémentation du module caution.
  const depotStatus: StepStatus = 'pending';

  return {
    checkin: {
      status: checkinStatus,
      label: checkinLabel(checkinStatus),
      shortLabel: 'Check-in',
      completedAt: checkinCompletedAt,
    },
    contrat: {
      status: contratStatus,
      label: contratLabel(contratStatus),
      shortLabel: 'Contrat',
      completedAt: contratCompletedAt,
    },
    identite: {
      status: identiteStatus,
      label: identiteLabel(identiteStatus),
      shortLabel: 'ID',
      completedAt: identiteCompletedAt,
    },
    depot: {
      status: depotStatus,
      label: 'Caution en attente',
      shortLabel: 'Caution',
    },
  };
}

function checkinLabel(s: StepStatus) {
  if (s === 'ok') return 'Check-in confirmé';
  if (s === 'blocking') return 'Check-in en retard – action requise';
  return 'Check-in en attente';
}

function contratLabel(s: StepStatus) {
  if (s === 'ok') return 'Contrat signé';
  if (s === 'blocking') return 'Contrat manquant – action requise';
  return 'Contrat en attente';
}

function identiteLabel(s: StepStatus) {
  if (s === 'ok') return 'Identité vérifiée';
  if (s === 'blocking') return 'Identité rejetée ou manquante – action requise';
  return 'Identité en attente';
}

// ── Catégorisation ─────────────────────────────────────────────────────────────

/**
 * Détermine la catégorie de filtre rapide d'une réservation.
 *
 * Logique :
 *  - "past"       : annulée, terminée, ou date de départ dépassée
 *  - "in_progress": checked_in ou checked_out (en séjour)
 *  - "to_handle"  : au moins un blocage, ou arrivée ≤ 48 h avec étape en attente
 *  - "upcoming"   : tout le reste
 */
export function getReservationCategory(
  reservation: Reservation,
  steps: ReservationSteps,
  now: Date = new Date()
): ReservationCategory {
  const checkOutMs = new Date(reservation.check_out_date).getTime();
  const checkInMs = new Date(reservation.check_in_date).getTime();
  const nowMs = now.getTime();

  if (
    reservation.status === 'cancelled' ||
    reservation.status === 'completed' ||
    checkOutMs < nowMs
  ) {
    return 'past';
  }

  if (reservation.status === 'checked_in' || reservation.status === 'checked_out') {
    return 'in_progress';
  }

  const hasBlocking = Object.values(steps).some((s) => s.status === 'blocking');
  const hoursUntil = (checkInMs - nowMs) / (1000 * 60 * 60);
  const hasPendingImminent =
    hoursUntil <= 48 && Object.values(steps).some((s) => s.status === 'pending');

  if (hasBlocking || hasPendingImminent) {
    return 'to_handle';
  }

  return 'upcoming';
}

// ── CTA contextuel ─────────────────────────────────────────────────────────────

/**
 * Retourne l'unique CTA à afficher sur la carte.
 *
 * Ordre de priorité (voir en-tête de fichier pour la documentation complète).
 */
export function computeReservationCta(
  reservation: Reservation,
  steps: ReservationSteps
): ReservationCta {
  // Réservations terminées ou annulées → pas d'action
  if (reservation.status === 'cancelled' || reservation.status === 'completed') {
    return { action: 'voir_details', label: 'Voir les détails', variant: 'secondary' };
  }

  // ID rejeté (bloquant absolu même si checked_in)
  if (steps.identite.status === 'blocking' && reservation.status !== 'checked_in') {
    return { action: 'contacter_invite', label: "Contacter le voyageur", variant: 'dangerSoft' };
  }

  // Check-in en retard (arrivée passée, statut pending)
  if (steps.checkin.status === 'blocking') {
    return { action: 'relancer_checkin', label: 'Relancer le check-in', variant: 'primary' };
  }

  // Contrat bloquant
  if (steps.contrat.status === 'blocking') {
    return { action: 'voir_contrat', label: 'Voir le contrat', variant: 'primary' };
  }

  // ID non fourni (pas encore bloquant, mais imminent)
  if (steps.identite.status === 'pending' && reservation.status === 'pending') {
    return { action: 'demander_id', label: "Demander l'ID", variant: 'primary' };
  }

  // Tout est ok côté contrat/ID, mais le check-in n'est pas validé
  if (reservation.status === 'pending') {
    return { action: 'valider_checkin', label: 'Valider le check-in', variant: 'secondary' };
  }

  // Séjour en cours → marquer terminé
  if (reservation.status === 'checked_in') {
    return { action: 'marquer_termine', label: 'Marquer terminé', variant: 'secondary' };
  }

  return { action: 'voir_details', label: 'Voir les détails', variant: 'secondary' };
}

// ── Tri par priorité ──────────────────────────────────────────────────────────

const CATEGORY_ORDER: Record<ReservationCategory, number> = {
  to_handle: 0,
  in_progress: 1,
  upcoming: 2,
  past: 3,
};

/**
 * Comparateur pour Array.prototype.sort().
 * Trie par catégorie de priorité, puis par date d'arrivée la plus proche.
 */
export function compareByPriority(
  a: { category: ReservationCategory; reservation: Pick<Reservation, 'check_in_date'> },
  b: { category: ReservationCategory; reservation: Pick<Reservation, 'check_in_date'> }
): number {
  const catDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
  if (catDiff !== 0) return catDiff;
  return (
    new Date(a.reservation.check_in_date).getTime() -
    new Date(b.reservation.check_in_date).getTime()
  );
}

// ── Utilitaire dates ───────────────────────────────────────────────────────────

/** Nombre de nuits entre deux dates ISO. */
export function nightsCount(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}
