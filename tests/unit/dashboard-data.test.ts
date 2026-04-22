import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { ContractSummary, VerificationSummary } from '../../src/lib/reservations-status';
import type { Reservation } from '../../src/lib/supabase';
import {
  computeActivityTimeline,
  computeTodayItems,
  computeWeekItems,
} from '../../src/lib/dashboard-data';

const NOW_ISO = '2026-04-22T10:00:00Z';
const NOW_MS = Date.parse(NOW_ISO);
const DAY_MS = 24 * 60 * 60 * 1000;

function isoFromOffsetDays(days: number): string {
  return new Date(NOW_MS + days * DAY_MS).toISOString();
}

function dateOnlyFromOffsetDays(days: number): string {
  return isoFromOffsetDays(days).slice(0, 10);
}

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'res-1',
    property_id: 'prop-1',
    guest_id: 'guest-1',
    check_in_date: dateOnlyFromOffsetDays(0),
    check_out_date: dateOnlyFromOffsetDays(2),
    number_of_guests: 2,
    booking_reference: 'R1',
    unique_link: 'link-1',
    status: 'pending',
    verification_mode: 'simple',
    verification_type: 'simple',
    smart_lock_code: null,
    guest_rating: 0,
    cancelled_at: undefined,
    notes: null,
    created_at: isoFromOffsetDays(-1),
    updated_at: isoFromOffsetDays(-1),
    ...overrides,
  };
}

function withMeta<T extends Reservation>(
  reservation: T,
  meta: Record<string, unknown>,
): T {
  return Object.assign(reservation, meta);
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

describe('dashboard-data helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW_ISO));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('computeTodayItems', () => {
    it('retourne une liste vide sans réservation', () => {
      expect(computeTodayItems([], new Date(NOW_ISO))).toEqual([]);
    });

    it("inclut l'arrivée du jour", () => {
      const reservation = withMeta(makeReservation(), {
        guest_name: 'John Doe',
        property_name: 'Logement Rabat',
        check_in_time: '14:30',
        contract_signed: true,
        verification_status: 'approved',
      });
      const items = computeTodayItems([reservation], new Date(NOW_ISO));
      expect(items.some((item) => item.type === 'arrival')).toBe(true);
      expect(items.find((item) => item.type === 'arrival')?.time).toBe('14:30');
    });

    it("inclut le départ du jour", () => {
      const reservation = withMeta(
        makeReservation({
          check_in_date: dateOnlyFromOffsetDays(-2),
          check_out_date: dateOnlyFromOffsetDays(0),
        }),
        { check_out_time: '11:00' },
      );
      const items = computeTodayItems([reservation], new Date(NOW_ISO));
      expect(items.some((item) => item.type === 'departure')).toBe(true);
    });

    it('ajoute une action critique quand check-in en attente le jour J', () => {
      const reservation = withMeta(makeReservation(), {
        guest_name: 'Amina',
        property_name: 'Logement Casa',
        check_in_time: '15:00',
      });
      const action = computeTodayItems([reservation], new Date(NOW_ISO))
        .find((item) => item.type === 'action');
      expect(action?.urgency).toBe('critical');
      expect(action?.ctaLabel).toBe('Valider le check-in');
    });

    it('limite à 5 éléments', () => {
      const data = Array.from({ length: 8 }).map((_, index) =>
        withMeta(
          makeReservation({
            id: `res-${index}`,
            check_in_date: dateOnlyFromOffsetDays(0),
            check_out_date: dateOnlyFromOffsetDays(0),
          }),
          { check_in_time: `0${index}:00` },
        ));
      const items = computeTodayItems(data, new Date(NOW_ISO));
      expect(items).toHaveLength(5);
    });

    it('trie critique avant normal', () => {
      const critical = withMeta(
        makeReservation({ id: 'critical', check_in_date: dateOnlyFromOffsetDays(0) }),
        { contract_signed: false, verification_status: 'pending' },
      );
      const normal = withMeta(
        makeReservation({
          id: 'normal',
          check_in_date: dateOnlyFromOffsetDays(0),
          status: 'checked_in',
        }),
        { contract_signed: true, verification_status: 'approved', check_in_time: '08:00' },
      );

      const items = computeTodayItems([normal, critical], new Date(NOW_ISO));
      expect(items[0]?.urgency).toBe('critical');
    });

    it("ignore les réservations hors fenêtre 'today'", () => {
      const reservation = makeReservation({ check_in_date: dateOnlyFromOffsetDays(2), check_out_date: dateOnlyFromOffsetDays(3) });
      expect(computeTodayItems([reservation], new Date(NOW_ISO))).toEqual([]);
    });

    it("formate le temps d'action avec le préfixe aujourd'hui", () => {
      const reservation = withMeta(makeReservation(), { check_in_time: '16:45' });
      const action = computeTodayItems([reservation], new Date(NOW_ISO))
        .find((item) => item.type === 'action');
      expect(action?.time.startsWith("aujourd'hui")).toBe(true);
    });
  });

  describe('computeWeekItems', () => {
    it('retourne vide sans action requise', () => {
      const reservation = withMeta(
        makeReservation({ check_in_date: dateOnlyFromOffsetDays(2), status: 'checked_in' }),
        { contract_signed: true, verification_status: 'approved' },
      );
      expect(computeWeekItems([reservation], new Date(NOW_ISO))).toEqual([]);
    });

    it('inclut J+1..J+7 uniquement', () => {
      const inRange = withMeta(
        makeReservation({ id: 'in-range', check_in_date: dateOnlyFromOffsetDays(2) }),
        { contract_signed: false, verification_status: 'approved' },
      );
      const outRange = withMeta(
        makeReservation({ id: 'out-range', check_in_date: dateOnlyFromOffsetDays(8) }),
        { contract_signed: false, verification_status: 'approved' },
      );
      const items = computeWeekItems([inRange, outRange], new Date(NOW_ISO));
      expect(items.map((item) => item.id)).toEqual(['in-range']);
    });

    it('exclut les réservations du jour', () => {
      const todayReservation = withMeta(
        makeReservation({ id: 'today', check_in_date: dateOnlyFromOffsetDays(0) }),
        { contract_signed: false, verification_status: 'approved' },
      );
      expect(computeWeekItems([todayReservation], new Date(NOW_ISO))).toHaveLength(0);
    });

    it("retourne l'action 'Signer le contrat' si contrat manquant", () => {
      const reservation = withMeta(
        makeReservation({ check_in_date: dateOnlyFromOffsetDays(3) }),
        { contract_signed: false, verification_status: 'approved' },
      );
      const item = computeWeekItems([reservation], new Date(NOW_ISO))[0];
      expect(item.actionLabel).toBe('Signer le contrat');
      expect(item.urgency).toBe('high');
    });

    it("retourne l'action 'Demander la pièce d'identité' si vérification manquante", () => {
      const reservation = withMeta(
        makeReservation({ check_in_date: dateOnlyFromOffsetDays(2) }),
        { contract_signed: true, verification_status: 'pending' },
      );
      const item = computeWeekItems([reservation], new Date(NOW_ISO))[0];
      expect(item.actionLabel).toBe("Demander la pièce d'identité");
    });

    it("retourne l'action caution en priorité normale", () => {
      const reservation = withMeta(
        makeReservation({ check_in_date: dateOnlyFromOffsetDays(4) }),
        { contract_signed: true, verification_status: 'approved', has_pending_deposit: true },
      );
      const item = computeWeekItems([reservation], new Date(NOW_ISO))[0];
      expect(item.actionLabel).toBe('Finaliser la caution');
      expect(item.urgency).toBe('normal');
    });

    it('trie high avant normal puis date', () => {
      const normal = withMeta(
        makeReservation({ id: 'normal', check_in_date: dateOnlyFromOffsetDays(1) }),
        { contract_signed: true, verification_status: 'approved', has_pending_deposit: true },
      );
      const high = withMeta(
        makeReservation({ id: 'high', check_in_date: dateOnlyFromOffsetDays(3) }),
        { contract_signed: false, verification_status: 'approved' },
      );

      const items = computeWeekItems([normal, high], new Date(NOW_ISO));
      expect(items[0].id).toBe('high');
      expect(items[1].id).toBe('normal');
    });

    it("utilise 'demain' pour J+1", () => {
      const reservation = withMeta(
        makeReservation({ check_in_date: dateOnlyFromOffsetDays(1) }),
        { contract_signed: false, verification_status: 'approved' },
      );
      expect(computeWeekItems([reservation], new Date(NOW_ISO))[0].dayLabel).toBe('demain');
    });
  });

  describe('computeActivityTimeline', () => {
    it('retourne vide sans événements', () => {
      expect(computeActivityTimeline([], [], [], 10)).toEqual([]);
    });

    it('inclut les contrats signés', () => {
      const contract = makeContract({
        signed_by_guest: true,
        signed_at: isoFromOffsetDays(-1),
      }) as ContractSummary & { guestName: string; propertyName: string; id: string };
      contract.guestName = 'Alice';
      contract.propertyName = 'Logement Fès';
      contract.id = 'c1';

      const events = computeActivityTimeline([contract], [], [], 10);
      expect(events[0].type).toBe('signature');
      expect(events[0].message).toContain('Alice');
    });

    it('inclut les identités validées (approved/verified/ok)', () => {
      const approved = makeVerification({ status: 'approved', verified_at: isoFromOffsetDays(-1) }) as VerificationSummary & { id: string };
      approved.id = 'v1';

      const verified = makeVerification({ status: 'pending', verified_at: isoFromOffsetDays(-2) }) as VerificationSummary & { id: string; status: string };
      verified.id = 'v2';
      verified.status = 'verified';

      const ok = makeVerification({ status: 'pending', verified_at: isoFromOffsetDays(-3) }) as VerificationSummary & { id: string; status: string };
      ok.id = 'v3';
      ok.status = 'ok';

      const events = computeActivityTimeline([], [approved, verified, ok], [], 10);
      expect(events.filter((event) => event.type === 'identity')).toHaveLength(3);
    });

    it('inclut les événements dépôt/check-in/réservation', () => {
      const events = computeActivityTimeline([], [], [
        { id: 'd1', event_type: 'deposit', status: 'secured', secured_at: isoFromOffsetDays(-1) },
        { id: 'k1', event_type: 'checkin', created_at: isoFromOffsetDays(-2) },
        { id: 'r1', event_type: 'reservation', created_at: isoFromOffsetDays(-3) },
      ], 10);

      expect(events.some((event) => event.type === 'deposit')).toBe(true);
      expect(events.some((event) => event.type === 'checkin')).toBe(true);
      expect(events.some((event) => event.type === 'reservation')).toBe(true);
    });

    it('trie par date décroissante', () => {
      const contracts = [
        makeContract({ signed_by_guest: true, signed_at: isoFromOffsetDays(-10) }) as ContractSummary & { id: string },
        makeContract({ signed_by_guest: true, signed_at: isoFromOffsetDays(-1) }) as ContractSummary & { id: string },
      ];
      contracts[0].id = 'old';
      contracts[1].id = 'new';

      const events = computeActivityTimeline(contracts, [], [], 10);
      expect(events[0].timestamp.getTime()).toBeGreaterThan(events[1].timestamp.getTime());
    });

    it('respecte la limite', () => {
      const contracts = Array.from({ length: 15 }).map((_, index) => {
        const contract = makeContract({
          signed_by_guest: true,
          signed_at: new Date(NOW_MS - index * 60000).toISOString(),
        }) as ContractSummary & { id: string };
        contract.id = `c-${index}`;
        return contract;
      });
      const events = computeActivityTimeline(contracts, [], [], 10);
      expect(events).toHaveLength(10);
    });

    it('ignore les événements invalides (non signés/non vérifiés/date invalide)', () => {
      const unsigned = makeContract({ signed_by_guest: false }) as ContractSummary & { id: string };
      unsigned.id = 'u1';
      const badDate = makeVerification({ status: 'approved', verified_at: 'invalid-date' }) as VerificationSummary & { id: string };
      badDate.id = 'b1';
      const rejected = makeVerification({ status: 'rejected', verified_at: isoFromOffsetDays(-1) }) as VerificationSummary & { id: string };
      rejected.id = 'rj1';

      const events = computeActivityTimeline([unsigned], [badDate, rejected], [], 10);
      expect(events).toHaveLength(0);
    });
  });
});
