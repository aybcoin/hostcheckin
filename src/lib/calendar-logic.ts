import type { Reservation } from './supabase';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReservationBlock {
  reservationId: string;
  propertyId: string;
  startDay: number;
  endDay: number;
  span: number;
  startsBeforeMonth: boolean;
  endsAfterMonth: boolean;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseReservationDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return startOfUtcDay(parsed);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * `month` suit l'API JS Date: janvier = 0, décembre = 11.
 * Les blocs couvrent `[check_in_date, check_out_date)` afin d'exclure le jour de départ.
 */
export function computeReservationBlocks(
  reservations: Reservation[],
  year: number,
  month: number,
): ReservationBlock[] {
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEndExclusive = new Date(Date.UTC(year, month + 1, 1));

  return reservations
    .filter((reservation) => reservation.status !== 'cancelled')
    .flatMap((reservation) => {
      const checkIn = parseReservationDate(reservation.check_in_date);
      const checkOut = parseReservationDate(reservation.check_out_date);

      if (!checkIn || !checkOut || checkOut <= checkIn) {
        return [];
      }

      const visibleStart = checkIn > monthStart ? checkIn : monthStart;
      const visibleEndExclusive = checkOut < monthEndExclusive ? checkOut : monthEndExclusive;

      if (visibleStart >= visibleEndExclusive) {
        return [];
      }

      const startDay = Math.floor((visibleStart.getTime() - monthStart.getTime()) / DAY_MS) + 1;
      const span = Math.floor((visibleEndExclusive.getTime() - visibleStart.getTime()) / DAY_MS);
      const endDay = startDay + span - 1;

      return [{
        reservationId: reservation.id,
        propertyId: reservation.property_id,
        startDay,
        endDay,
        span,
        startsBeforeMonth: checkIn < monthStart,
        endsAfterMonth: checkOut > monthEndExclusive,
      }];
    })
    .sort((left, right) => {
      if (left.propertyId !== right.propertyId) {
        return left.propertyId.localeCompare(right.propertyId);
      }

      if (left.startDay !== right.startDay) {
        return left.startDay - right.startDay;
      }

      return left.reservationId.localeCompare(right.reservationId);
    });
}
