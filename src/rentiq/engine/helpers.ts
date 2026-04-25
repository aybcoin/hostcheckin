import type { Booking } from '../types';
import { addDays, isDateInRange } from '../utils/dates';

const ACTIVE_BOOKING_STATUSES: Booking['status'][] = ['confirmed', 'completed'];

export function isDateBooked(date: string, bookings: Booking[]): boolean {
  return bookings.some((booking) => {
    if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) return false;
    const lastBookedNight = addDays(booking.checkOut, -1);
    return isDateInRange(date, booking.checkIn, lastBookedNight);
  });
}

export function getDayStatus(date: string, bookings: Booking[]): 'free' | 'reserved' | 'blocked' {
  const blockingReservation = bookings.find((booking) => {
    if (booking.status !== 'blocked') return false;
    const lastBlockedNight = addDays(booking.checkOut, -1);
    return isDateInRange(date, booking.checkIn, lastBlockedNight);
  });

  if (blockingReservation) return 'blocked';
  if (isDateBooked(date, bookings)) return 'reserved';
  return 'free';
}

export function roundPrice(value: number): number {
  return Math.round(value);
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  const bounded = Math.max(min, Math.min(max, value));
  return (bounded - min) / (max - min);
}
