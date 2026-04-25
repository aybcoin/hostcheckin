import type { Booking } from '../../types';
import { addDays, fromISODate } from '../../utils/dates';

interface OccupancyInput {
  date: string;
  listingId: string;
  bookings: Booking[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDayNumber(date: string): number {
  return Math.floor(fromISODate(date).getTime() / DAY_MS);
}

function isActiveBooking(booking: Booking): boolean {
  return booking.status === 'confirmed' || booking.status === 'completed';
}

function calculateOccupancyRateInWindow(input: OccupancyInput): number {
  const windowStartDate = addDays(input.date, -21);
  const windowEndDate = addDays(input.date, 21);
  const windowStartDay = toDayNumber(windowStartDate);
  const windowEndDay = toDayNumber(windowEndDate);
  const windowLength = windowEndDay - windowStartDay + 1;

  let bookedNights = 0;

  for (const booking of input.bookings) {
    if (booking.listingId !== input.listingId) continue;
    if (!isActiveBooking(booking)) continue;

    const bookingStartDay = toDayNumber(booking.checkIn);
    const bookingEndDay = toDayNumber(addDays(booking.checkOut, -1));
    const overlapStart = Math.max(windowStartDay, bookingStartDay);
    const overlapEnd = Math.min(windowEndDay, bookingEndDay);

    if (overlapStart <= overlapEnd) {
      bookedNights += overlapEnd - overlapStart + 1;
    }
  }

  const rawRate = bookedNights / windowLength;
  return Math.max(0, Math.min(1, rawRate));
}

export function calculateOccupancyFactor(input: OccupancyInput): number {
  const occupancyRate = calculateOccupancyRateInWindow(input);

  if (occupancyRate > 0.8) return 1.3;
  if (occupancyRate > 0.6) return 1.15;
  if (occupancyRate >= 0.4) return 1;
  if (occupancyRate >= 0.2) return 0.95;
  return 0.9;
}

export function calculateOccupancyRate(input: OccupancyInput): number {
  return calculateOccupancyRateInWindow(input);
}
