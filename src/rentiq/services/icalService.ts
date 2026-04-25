import ICAL from 'ical.js';
import type { Booking } from '../types';
import { diffInDays, toISODate } from '../utils/dates';

export async function fetchIcalContent(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Impossible de charger le flux iCal (${response.status}).`);
  }

  return response.text();
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function icalTimeToISODate(value: unknown): string | null {
  if (value && typeof value === 'object') {
    const candidate = value as {
      year?: unknown;
      month?: unknown;
      day?: unknown;
      toJSDate?: () => Date;
    };

    if (
      typeof candidate.year === 'number' &&
      typeof candidate.month === 'number' &&
      typeof candidate.day === 'number'
    ) {
      return formatDateParts(candidate.year, candidate.month, candidate.day);
    }

    if (typeof candidate.toJSDate === 'function') {
      return toISODate(candidate.toJSDate());
    }
  }

  return null;
}

export function parseBookingsFromIcal(content: string, listingId: string): Booking[] {
  let jcalData: ReturnType<typeof ICAL.parse>;
  try {
    jcalData = ICAL.parse(content);
  } catch {
    throw new Error('Flux iCal invalide: parsing impossible.');
  }
  const calendar = new ICAL.Component(jcalData);
  const events = calendar.getAllSubcomponents('vevent');
  const nowIso = new Date().toISOString();

  return events
    .map((subcomponent, index) => {
      const event = new ICAL.Event(subcomponent);
      const checkIn = icalTimeToISODate(event.startDate);
      const checkOut = icalTimeToISODate(event.endDate);
      if (!checkIn || !checkOut) return null;
      const nights = Math.max(1, diffInDays(checkIn, checkOut));
      const summary = event.summary ?? '';
      const bookingIdBase = `${listingId}-${checkIn}-${checkOut}-${summary}`.replace(/\s+/g, '-').toLowerCase();

      return {
        id: `ical-${bookingIdBase}-${index}`,
        listingId,
        source: 'airbnb',
        checkIn,
        checkOut,
        nights,
        totalRevenue: 0,
        pricePerNight: 0,
        guestCount: 1,
        status: 'confirmed',
        importedFrom: 'ical',
        rawSummary: summary,
        createdAt: nowIso,
        updatedAt: nowIso,
      } as Booking;
    })
    .filter((booking): booking is Booking => booking !== null);
}
