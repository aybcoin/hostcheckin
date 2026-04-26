import { describe, expect, it } from 'vitest';
import { computeReservationBlocks, daysInMonth } from '../../src/lib/calendar-logic';
import type { Reservation } from '../../src/lib/supabase';

function reservation(overrides: Partial<Reservation>): Reservation {
  return {
    id: overrides.id ?? 'reservation-1',
    property_id: overrides.property_id ?? 'property-1',
    guest_id: null,
    check_in_date: overrides.check_in_date ?? '2026-04-10',
    check_out_date: overrides.check_out_date ?? '2026-04-12',
    number_of_guests: 2,
    booking_reference: 'HC-001',
    unique_link: 'token',
    status: overrides.status ?? 'pending',
    total_amount: null,
    verification_type: 'simple',
    verification_mode: 'simple',
    smart_lock_code: null,
    guest_rating: undefined,
    cancelled_at: undefined,
    notes: null,
    external_source: null,
    external_uid: null,
    external_feed_id: null,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
  };
}

describe('calendar logic', () => {
  it('returns the correct number of days in a month', () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2026, 3)).toBe(30);
    expect(daysInMonth(2026, 4)).toBe(31);
  });

  it('creates a block fully inside the month', () => {
    expect(computeReservationBlocks([reservation({ id: 'a' })], 2026, 3)).toEqual([
      {
        reservationId: 'a',
        propertyId: 'property-1',
        startDay: 10,
        endDay: 11,
        span: 2,
        startsBeforeMonth: false,
        endsAfterMonth: false,
      },
    ]);
  });

  it('clips a block starting before the month', () => {
    expect(
      computeReservationBlocks([reservation({ id: 'a', check_in_date: '2026-03-28', check_out_date: '2026-04-03' })], 2026, 3),
    ).toEqual([
      {
        reservationId: 'a',
        propertyId: 'property-1',
        startDay: 1,
        endDay: 2,
        span: 2,
        startsBeforeMonth: true,
        endsAfterMonth: false,
      },
    ]);
  });

  it('clips a block ending after the month', () => {
    expect(
      computeReservationBlocks([reservation({ id: 'a', check_in_date: '2026-04-29', check_out_date: '2026-05-04' })], 2026, 3),
    ).toEqual([
      {
        reservationId: 'a',
        propertyId: 'property-1',
        startDay: 29,
        endDay: 30,
        span: 2,
        startsBeforeMonth: false,
        endsAfterMonth: true,
      },
    ]);
  });

  it('clips a block spanning the whole month', () => {
    expect(
      computeReservationBlocks([reservation({ id: 'a', check_in_date: '2026-03-20', check_out_date: '2026-05-10' })], 2026, 3),
    ).toEqual([
      {
        reservationId: 'a',
        propertyId: 'property-1',
        startDay: 1,
        endDay: 30,
        span: 30,
        startsBeforeMonth: true,
        endsAfterMonth: true,
      },
    ]);
  });

  it('excludes the checkout day from the block span', () => {
    expect(
      computeReservationBlocks([reservation({ id: 'a', check_in_date: '2026-04-10', check_out_date: '2026-04-11' })], 2026, 3),
    ).toEqual([
      {
        reservationId: 'a',
        propertyId: 'property-1',
        startDay: 10,
        endDay: 10,
        span: 1,
        startsBeforeMonth: false,
        endsAfterMonth: false,
      },
    ]);
  });

  it('ignores reservations completely outside the month', () => {
    expect(
      computeReservationBlocks([reservation({ check_in_date: '2026-05-02', check_out_date: '2026-05-05' })], 2026, 3),
    ).toEqual([]);
  });

  it('ignores cancelled reservations', () => {
    expect(
      computeReservationBlocks([reservation({ status: 'cancelled' })], 2026, 3),
    ).toEqual([]);
  });

  it('ignores invalid date ranges', () => {
    expect(
      computeReservationBlocks([reservation({ check_in_date: '2026-04-12', check_out_date: '2026-04-12' })], 2026, 3),
    ).toEqual([]);
  });

  it('sorts blocks by property and start day', () => {
    const blocks = computeReservationBlocks([
      reservation({ id: 'b', property_id: 'property-2', check_in_date: '2026-04-12', check_out_date: '2026-04-14' }),
      reservation({ id: 'a', property_id: 'property-1', check_in_date: '2026-04-15', check_out_date: '2026-04-17' }),
      reservation({ id: 'c', property_id: 'property-1', check_in_date: '2026-04-09', check_out_date: '2026-04-10' }),
    ], 2026, 3);

    expect(blocks.map((block) => block.reservationId)).toEqual(['c', 'a', 'b']);
  });

  it('handles February in leap years', () => {
    expect(
      computeReservationBlocks([reservation({ check_in_date: '2028-02-28', check_out_date: '2028-03-02' })], 2028, 1),
    ).toEqual([
      {
        reservationId: 'reservation-1',
        propertyId: 'property-1',
        startDay: 28,
        endDay: 29,
        span: 2,
        startsBeforeMonth: false,
        endsAfterMonth: true,
      },
    ]);
  });
});
