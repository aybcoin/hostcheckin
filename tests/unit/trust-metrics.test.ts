import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reservation } from '../../src/lib/supabase';
import type { ContractSummary, VerificationSummary } from '../../src/lib/reservations-status';
import { computeTrustMetrics } from '../../src/lib/trust-metrics';

const NOW_ISO = '2026-04-22T10:00:00Z';
const NOW_MS = Date.parse(NOW_ISO);
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgoIso(days: number): string {
  return new Date(NOW_MS - days * DAY_MS).toISOString();
}

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'res-1',
    property_id: 'prop-1',
    guest_id: 'guest-1',
    check_in_date: '2026-04-23',
    check_out_date: '2026-04-25',
    number_of_guests: 2,
    booking_reference: 'REF#1',
    unique_link: 'abc',
    status: 'pending',
    verification_mode: 'simple',
    verification_type: 'simple',
    smart_lock_code: null,
    guest_rating: 0,
    cancelled_at: undefined,
    notes: null,
    created_at: daysAgoIso(2),
    updated_at: daysAgoIso(2),
    ...overrides,
  };
}

function makeContract(overrides: Partial<ContractSummary> = {}): ContractSummary {
  return {
    signed_by_guest: false,
    signed_at: undefined,
    ...overrides,
  };
}

function makeVerification(overrides: Partial<VerificationSummary> = {}): VerificationSummary {
  return {
    status: 'pending',
    verified_at: undefined,
    ...overrides,
  };
}

describe('computeTrustMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW_ISO));
    (globalThis as { __HC_TRUST_DEPOSITS_ENABLED__?: boolean }).__HC_TRUST_DEPOSITS_ENABLED__ = false;
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as { __HC_TRUST_DEPOSITS_ENABLED__?: boolean }).__HC_TRUST_DEPOSITS_ENABLED__;
  });

  it('retourne zéro partout quand les tableaux sont vides', () => {
    const metrics = computeTrustMetrics([], [], []);
    expect(metrics).toEqual({ signatures: 0, identities: 0, deposits: 0, windowDays: 30 });
  });

  it('compte les signatures signées dans la fenêtre de 30 jours', () => {
    const contracts = [
      makeContract({ signed_by_guest: true, signed_at: daysAgoIso(3) }),
      makeContract({ signed_by_guest: true, signed_at: daysAgoIso(29) }),
      makeContract({ signed_by_guest: true, signed_at: daysAgoIso(35) }),
      makeContract({ signed_by_guest: false, signed_at: daysAgoIso(1) }),
    ];

    const metrics = computeTrustMetrics([], contracts, []);
    expect(metrics.signatures).toBe(2);
  });

  it('reconnaît aussi un contrat signé via status=\"signed\"', () => {
    const signedViaStatus = makeContract({
      signed_by_guest: false,
      signed_at: undefined,
    }) as ContractSummary & { status: string; created_at: string };
    signedViaStatus.status = 'signed';
    signedViaStatus.created_at = daysAgoIso(2);

    const metrics = computeTrustMetrics([], [signedViaStatus], []);
    expect(metrics.signatures).toBe(1);
  });

  it('compte les identités validées avec status approved/verified/ok', () => {
    const approved = makeVerification({ status: 'approved', verified_at: daysAgoIso(5) });
    const verified = makeVerification({
      status: 'pending',
      verified_at: daysAgoIso(4),
    }) as VerificationSummary & { status: string };
    verified.status = 'verified';
    const okStatus = makeVerification({
      status: 'pending',
      verified_at: daysAgoIso(3),
    }) as VerificationSummary & { status: string };
    okStatus.status = 'ok';
    const rejected = makeVerification({ status: 'rejected', verified_at: daysAgoIso(2) });

    const metrics = computeTrustMetrics([], [], [approved, verified, okStatus, rejected]);
    expect(metrics.identities).toBe(3);
  });

  it('respecte windowDays personnalisé', () => {
    const contracts = [
      makeContract({ signed_by_guest: true, signed_at: daysAgoIso(2) }),
      makeContract({ signed_by_guest: true, signed_at: daysAgoIso(10) }),
    ];
    const verifications = [
      makeVerification({ status: 'approved', verified_at: daysAgoIso(1) }),
      makeVerification({ status: 'approved', verified_at: daysAgoIso(8) }),
    ];

    const metrics = computeTrustMetrics([], contracts, verifications, 7);
    expect(metrics.windowDays).toBe(7);
    expect(metrics.signatures).toBe(1);
    expect(metrics.identities).toBe(1);
  });

  it('ignore les données manquantes (date absente) sans planter', () => {
    const contracts = [makeContract({ signed_by_guest: true, signed_at: undefined })];
    const verifications = [makeVerification({ status: 'approved', verified_at: undefined })];

    const metrics = computeTrustMetrics([], contracts, verifications);
    expect(metrics.signatures).toBe(0);
    expect(metrics.identities).toBe(0);
  });

  it('inclut les dates à la limite de fenêtre (borne incluse)', () => {
    const startBoundary = new Date(NOW_MS - 30 * DAY_MS).toISOString();
    const contracts = [
      makeContract({ signed_by_guest: true, signed_at: startBoundary }),
      makeContract({ signed_by_guest: true, signed_at: NOW_ISO }),
    ];
    const verifications = [
      makeVerification({ status: 'approved', verified_at: startBoundary }),
      makeVerification({ status: 'approved', verified_at: NOW_ISO }),
    ];

    const metrics = computeTrustMetrics([], contracts, verifications);
    expect(metrics.signatures).toBe(2);
    expect(metrics.identities).toBe(2);
  });

  it('donne le même résultat quelle que soit l’ordre des tableaux', () => {
    const ordered = [
      makeContract({ signed_by_guest: true, signed_at: daysAgoIso(1) }),
      makeContract({ signed_by_guest: true, signed_at: daysAgoIso(2) }),
      makeContract({ signed_by_guest: true, signed_at: daysAgoIso(3) }),
    ];
    const reversed = [...ordered].reverse();

    const m1 = computeTrustMetrics([], ordered, []);
    const m2 = computeTrustMetrics([], reversed, []);
    expect(m1.signatures).toBe(3);
    expect(m2.signatures).toBe(3);
  });

  it('la métrique caution reste à 0 si le feature flag est inactif', () => {
    const activeReservation = makeReservation() as Reservation & {
      caution_active: boolean;
      caution_secured_at: string;
    };
    activeReservation.caution_active = true;
    activeReservation.caution_secured_at = daysAgoIso(2);

    const metrics = computeTrustMetrics([activeReservation], [], []);
    expect(metrics.deposits).toBe(0);
  });

  it('compte les cautions actives quand le feature flag est activé', () => {
    (globalThis as { __HC_TRUST_DEPOSITS_ENABLED__?: boolean }).__HC_TRUST_DEPOSITS_ENABLED__ = true;

    const inWindow = makeReservation() as Reservation & {
      deposit_status: string;
      deposit_paid_at: string;
    };
    inWindow.deposit_status = 'secured';
    inWindow.deposit_paid_at = daysAgoIso(2);

    const outOfWindow = makeReservation({ id: 'res-2' }) as Reservation & {
      caution_active: boolean;
      caution_secured_at: string;
    };
    outOfWindow.caution_active = true;
    outOfWindow.caution_secured_at = daysAgoIso(40);

    const metrics = computeTrustMetrics([inWindow, outOfWindow], [], []);
    expect(metrics.deposits).toBe(1);
  });
});
