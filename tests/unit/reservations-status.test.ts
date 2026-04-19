/**
 * Tests unitaires pour src/lib/reservations-status.ts
 *
 * Couverture :
 *  - computeReservationSteps : tous les états de chaque étape
 *  - getReservationCategory  : catégorisation correcte
 *  - computeReservationCta   : sélection de la bonne action prioritaire
 *  - compareByPriority       : ordre de tri
 *  - nightsCount             : calcul de durée
 */

import { describe, it, expect } from 'vitest';
import type { Reservation } from '../../src/lib/supabase';
import {
  computeReservationSteps,
  getReservationCategory,
  computeReservationCta,
  compareByPriority,
  nightsCount,
  type VerificationSummary,
  type ContractSummary,
} from '../../src/lib/reservations-status';

// ── Helpers ────────────────────────────────────────────────────────────────────

const NOW = new Date('2026-04-19T10:00:00Z');
const TODAY = '2026-04-19';
const YESTERDAY = '2026-04-18';
const TOMORROW = '2026-04-20';
const IN_3_DAYS = '2026-04-22';
const IN_10_DAYS = '2026-04-29';
const LAST_WEEK = '2026-04-12';

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'res-1',
    property_id: 'prop-1',
    guest_id: 'guest-1',
    check_in_date: TOMORROW,
    check_out_date: IN_10_DAYS,
    number_of_guests: 2,
    booking_reference: 'REF001',
    unique_link: 'abc123',
    status: 'pending',
    verification_type: 'simple',
    verification_mode: 'simple',
    smart_lock_code: null,
    guest_rating: null,
    cancelled_at: null,
    notes: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

const verApproved: VerificationSummary = {
  status: 'approved',
  verified_at: '2026-04-18T14:00:00Z',
};
const verPending: VerificationSummary = { status: 'pending' };
const verRejected: VerificationSummary = { status: 'rejected' };
const contractSigned: ContractSummary = {
  signed_by_guest: true,
  signed_at: '2026-04-18T12:00:00Z',
};
const contractUnsigned: ContractSummary = { signed_by_guest: false };

// ── computeReservationSteps ────────────────────────────────────────────────────

describe('computeReservationSteps', () => {
  describe('checkin step', () => {
    it('should be "ok" when status is checked_in', () => {
      const r = makeReservation({ status: 'checked_in', check_in_date: TODAY });
      const steps = computeReservationSteps(r, undefined, undefined, NOW);
      expect(steps.checkin.status).toBe('ok');
    });

    it('should be "ok" when status is completed', () => {
      const r = makeReservation({ status: 'completed', check_in_date: YESTERDAY });
      const steps = computeReservationSteps(r, undefined, undefined, NOW);
      expect(steps.checkin.status).toBe('ok');
    });

    it('should be "blocking" when arrival has passed but status is still pending', () => {
      const r = makeReservation({ status: 'pending', check_in_date: YESTERDAY });
      const steps = computeReservationSteps(r, undefined, undefined, NOW);
      expect(steps.checkin.status).toBe('blocking');
    });

    it('should be "pending" for future reservation', () => {
      const r = makeReservation({ status: 'pending', check_in_date: IN_10_DAYS });
      const steps = computeReservationSteps(r, undefined, undefined, NOW);
      expect(steps.checkin.status).toBe('pending');
    });

    it('should be "pending" for cancelled reservation', () => {
      const r = makeReservation({ status: 'cancelled', check_in_date: YESTERDAY });
      const steps = computeReservationSteps(r, undefined, undefined, NOW);
      expect(steps.checkin.status).toBe('pending');
    });
  });

  describe('contrat step', () => {
    it('should be "ok" when contract is signed', () => {
      const r = makeReservation({ check_in_date: IN_10_DAYS });
      const steps = computeReservationSteps(r, undefined, contractSigned, NOW);
      expect(steps.contrat.status).toBe('ok');
      expect(steps.contrat.completedAt).toBe(contractSigned.signed_at);
    });

    it('should be "blocking" when arrival is past and no contract', () => {
      const r = makeReservation({ status: 'pending', check_in_date: YESTERDAY });
      const steps = computeReservationSteps(r, undefined, contractUnsigned, NOW);
      expect(steps.contrat.status).toBe('blocking');
    });

    it('should be "blocking" when arrival is imminent (≤48h) and no contract', () => {
      // TOMORROW est dans ~24h, soit sous le seuil de 48h
      const r = makeReservation({ check_in_date: TOMORROW });
      const steps = computeReservationSteps(r, undefined, contractUnsigned, NOW);
      expect(steps.contrat.status).toBe('blocking');
    });

    it('should be "pending" for distant future reservation without contract', () => {
      const r = makeReservation({ check_in_date: IN_10_DAYS });
      const steps = computeReservationSteps(r, undefined, contractUnsigned, NOW);
      expect(steps.contrat.status).toBe('pending');
    });
  });

  describe('identite step', () => {
    it('should be "ok" when verification is approved', () => {
      const r = makeReservation({ check_in_date: IN_10_DAYS });
      const steps = computeReservationSteps(r, verApproved, undefined, NOW);
      expect(steps.identite.status).toBe('ok');
      expect(steps.identite.completedAt).toBe(verApproved.verified_at);
    });

    it('should be "blocking" when verification is rejected', () => {
      const r = makeReservation({ check_in_date: IN_10_DAYS });
      const steps = computeReservationSteps(r, verRejected, undefined, NOW);
      expect(steps.identite.status).toBe('blocking');
    });

    it('should be "blocking" when arrival is imminent and no verification', () => {
      const r = makeReservation({ check_in_date: TOMORROW });
      const steps = computeReservationSteps(r, undefined, undefined, NOW);
      expect(steps.identite.status).toBe('blocking');
    });

    it('should be "pending" for distant future reservation without verification', () => {
      const r = makeReservation({ check_in_date: IN_10_DAYS });
      const steps = computeReservationSteps(r, verPending, undefined, NOW);
      expect(steps.identite.status).toBe('pending');
    });
  });

  describe('depot step', () => {
    it('should always be "pending" (feature not yet implemented)', () => {
      const r = makeReservation({ status: 'completed' });
      const steps = computeReservationSteps(r, verApproved, contractSigned, NOW);
      expect(steps.depot.status).toBe('pending');
    });
  });

  describe('label accessibility', () => {
    it('should provide descriptive labels for screen readers', () => {
      const r = makeReservation({ status: 'pending', check_in_date: YESTERDAY });
      const steps = computeReservationSteps(r, verRejected, undefined, NOW);
      // Les labels doivent contenir des mots-clés explicites, pas uniquement la couleur
      expect(steps.checkin.label).toContain('retard');
      expect(steps.identite.label).toContain('action requise');
    });
  });
});

// ── getReservationCategory ─────────────────────────────────────────────────────

describe('getReservationCategory', () => {
  it('should be "past" for completed reservation', () => {
    const r = makeReservation({ status: 'completed', check_in_date: LAST_WEEK, check_out_date: YESTERDAY });
    const steps = computeReservationSteps(r, verApproved, contractSigned, NOW);
    expect(getReservationCategory(r, steps, NOW)).toBe('past');
  });

  it('should be "past" for cancelled reservation', () => {
    const r = makeReservation({ status: 'cancelled', check_in_date: IN_3_DAYS, check_out_date: IN_10_DAYS });
    const steps = computeReservationSteps(r, undefined, undefined, NOW);
    expect(getReservationCategory(r, steps, NOW)).toBe('past');
  });

  it('should be "in_progress" for checked_in reservation', () => {
    const r = makeReservation({ status: 'checked_in', check_in_date: TODAY, check_out_date: IN_3_DAYS });
    const steps = computeReservationSteps(r, verApproved, contractSigned, NOW);
    expect(getReservationCategory(r, steps, NOW)).toBe('in_progress');
  });

  it('should be "to_handle" when a step is blocking', () => {
    // Arrivée passée, pas de check-in → blocking
    const r = makeReservation({ status: 'pending', check_in_date: YESTERDAY, check_out_date: IN_3_DAYS });
    const steps = computeReservationSteps(r, undefined, undefined, NOW);
    expect(steps.checkin.status).toBe('blocking');
    expect(getReservationCategory(r, steps, NOW)).toBe('to_handle');
  });

  it('should be "to_handle" when arrival ≤48h and step is pending', () => {
    const r = makeReservation({ status: 'pending', check_in_date: TOMORROW, check_out_date: IN_10_DAYS });
    const steps = computeReservationSteps(r, undefined, undefined, NOW);
    // L'arrivée imminente fait que contrat/identite sont "blocking" → to_handle aussi
    expect(getReservationCategory(r, steps, NOW)).toBe('to_handle');
  });

  it('should be "upcoming" for well-prepared future reservation', () => {
    const r = makeReservation({ status: 'pending', check_in_date: IN_10_DAYS, check_out_date: '2026-05-10' });
    const steps = computeReservationSteps(r, verApproved, contractSigned, NOW);
    expect(getReservationCategory(r, steps, NOW)).toBe('upcoming');
  });
});

// ── computeReservationCta ─────────────────────────────────────────────────────

describe('computeReservationCta', () => {
  it('should prioritize contacter_invite for rejected identity', () => {
    const r = makeReservation({ status: 'pending', check_in_date: IN_10_DAYS });
    const steps = computeReservationSteps(r, verRejected, undefined, NOW);
    const cta = computeReservationCta(r, steps);
    expect(cta.action).toBe('contacter_invite');
    expect(cta.variant).toBe('dangerSoft');
  });

  it('should suggest relancer_checkin when checkin is blocking', () => {
    const r = makeReservation({ status: 'pending', check_in_date: YESTERDAY, check_out_date: TOMORROW });
    const steps = computeReservationSteps(r, verApproved, contractSigned, NOW);
    const cta = computeReservationCta(r, steps);
    expect(cta.action).toBe('relancer_checkin');
    expect(cta.variant).toBe('primary');
  });

  it('should suggest voir_contrat when contract is blocking', () => {
    const r = makeReservation({ status: 'pending', check_in_date: TOMORROW, check_out_date: IN_10_DAYS });
    const steps = computeReservationSteps(r, verApproved, contractUnsigned, NOW);
    const cta = computeReservationCta(r, steps);
    expect(cta.action).toBe('voir_contrat');
  });

  it('should suggest demander_id for pending verification on future reservation', () => {
    const r = makeReservation({ status: 'pending', check_in_date: IN_10_DAYS });
    const steps = computeReservationSteps(r, verPending, contractSigned, NOW);
    const cta = computeReservationCta(r, steps);
    expect(cta.action).toBe('demander_id');
  });

  it('should suggest marquer_termine for checked_in reservation', () => {
    const r = makeReservation({ status: 'checked_in', check_in_date: TODAY, check_out_date: IN_3_DAYS });
    const steps = computeReservationSteps(r, verApproved, contractSigned, NOW);
    const cta = computeReservationCta(r, steps);
    expect(cta.action).toBe('marquer_termine');
  });

  it('should return voir_details for completed reservation', () => {
    const r = makeReservation({ status: 'completed', check_in_date: LAST_WEEK, check_out_date: YESTERDAY });
    const steps = computeReservationSteps(r, verApproved, contractSigned, NOW);
    const cta = computeReservationCta(r, steps);
    expect(cta.action).toBe('voir_details');
  });
});

// ── compareByPriority ─────────────────────────────────────────────────────────

describe('compareByPriority', () => {
  it('should place to_handle before upcoming', () => {
    const a = {
      category: 'to_handle' as const,
      reservation: makeReservation({ check_in_date: IN_10_DAYS }),
    };
    const b = {
      category: 'upcoming' as const,
      reservation: makeReservation({ check_in_date: TOMORROW }),
    };
    expect(compareByPriority(a, b)).toBeLessThan(0);
  });

  it('should sort by check_in_date within same category', () => {
    const earlier = {
      category: 'upcoming' as const,
      reservation: makeReservation({ check_in_date: IN_3_DAYS }),
    };
    const later = {
      category: 'upcoming' as const,
      reservation: makeReservation({ check_in_date: IN_10_DAYS }),
    };
    expect(compareByPriority(earlier, later)).toBeLessThan(0);
    expect(compareByPriority(later, earlier)).toBeGreaterThan(0);
  });
});

// ── nightsCount ───────────────────────────────────────────────────────────────

describe('nightsCount', () => {
  it('should return 3 for a 3-night stay', () => {
    expect(nightsCount('2026-04-19', '2026-04-22')).toBe(3);
  });

  it('should return 1 for a 1-night stay', () => {
    expect(nightsCount('2026-04-19', '2026-04-20')).toBe(1);
  });

  it('should return 0 for same-day (invalid)', () => {
    expect(nightsCount('2026-04-19', '2026-04-19')).toBe(0);
  });
});
