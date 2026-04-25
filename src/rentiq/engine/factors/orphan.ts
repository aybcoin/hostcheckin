import type { Booking } from '../../types';
import { addDays } from '../../utils/dates';
import { isDateBooked } from '../helpers';

interface OrphanInput {
  date: string;
  bookings: Booking[];
}

export function calculateOrphanFactor(input: OrphanInput): number {
  const isFree = !isDateBooked(input.date, input.bookings);
  if (!isFree) return 1;

  const previousDate = addDays(input.date, -1);
  const nextDate = addDays(input.date, 1);
  const previousBooked = isDateBooked(previousDate, input.bookings);
  const nextBooked = isDateBooked(nextDate, input.bookings);

  if (previousBooked && nextBooked) {
    return 0.85;
  }

  return 1;
}
