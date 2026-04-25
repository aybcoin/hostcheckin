import { describe, expect, it } from 'vitest';
import { parseBookingsFromCsv } from '../../../src/rentiq/services/csvService';
import { parseBookingsFromIcal } from '../../../src/rentiq/services/icalService';
import { addDays, diffInDays, fromISODate, toISODate } from '../../../src/rentiq/utils/dates';

describe('csv parser', () => {
  it('ignores rows with invalid date ranges', () => {
    const csv = [
      'checkIn,checkOut,totalRevenue,guestCount',
      '2026-05-10,2026-05-09,1500,2',
      '2026-05-10,2026-05-12,1500,2',
    ].join('\n');

    const bookings = parseBookingsFromCsv(csv, 'listing-1');
    expect(bookings).toHaveLength(1);
    expect(bookings[0]?.nights).toBe(2);
  });
});

describe('ical parser', () => {
  it('parses all-day events without shifting check-in/out dates', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:test-1',
      'DTSTART;VALUE=DATE:20260619',
      'DTEND;VALUE=DATE:20260622',
      'SUMMARY:Reservation test',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const bookings = parseBookingsFromIcal(ics, 'listing-1');

    expect(bookings).toHaveLength(1);
    expect(bookings[0]?.checkIn).toBe('2026-06-19');
    expect(bookings[0]?.checkOut).toBe('2026-06-22');
    expect(bookings[0]?.nights).toBe(3);
  });

  it('throws on invalid iCal payload', () => {
    expect(() => parseBookingsFromIcal('INVALID_ICAL', 'listing-1')).toThrow('Flux iCal invalide');
  });
});

describe('date utilities', () => {
  it('keeps stable UTC date arithmetic', () => {
    const date = fromISODate('2026-03-28');
    expect(toISODate(date)).toBe('2026-03-28');
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(diffInDays('2026-03-28', '2026-03-29')).toBe(1);
  });
});
