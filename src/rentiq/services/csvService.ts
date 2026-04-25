import Papa from 'papaparse';
import type { Booking } from '../types';
import { diffInDays, toISODate } from '../utils/dates';

interface CsvRow {
  checkIn?: string;
  checkOut?: string;
  check_in?: string;
  check_out?: string;
  start_date?: string;
  end_date?: string;
  totalRevenue?: string;
  total_revenue?: string;
  amount?: string;
  guestCount?: string;
  guests?: string;
  source?: string;
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return toISODate(parsed);
}

function parseNumber(raw: string | undefined, fallback: number = 0): number {
  if (!raw) return fallback;
  const normalized = raw.replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseBookingsFromCsv(content: string, listingId: string): Booking[] {
  const parsed = Papa.parse<CsvRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV invalide: ${parsed.errors[0]?.message ?? 'Erreur de parsing'}`);
  }

  const nowIso = new Date().toISOString();
  const bookings: Booking[] = [];

  parsed.data.forEach((row, index) => {
    const checkInRaw = row.checkIn ?? row.check_in ?? row.start_date;
    const checkOutRaw = row.checkOut ?? row.check_out ?? row.end_date;
    if (!checkInRaw || !checkOutRaw) return;

    const checkIn = parseDate(checkInRaw);
    const checkOut = parseDate(checkOutRaw);
    if (!checkIn || !checkOut) return;

    const nights = diffInDays(checkIn, checkOut);
    if (nights <= 0) return;
    const totalRevenue = parseNumber(row.totalRevenue ?? row.total_revenue ?? row.amount, 0);
    const guestCount = Math.max(1, Math.round(parseNumber(row.guestCount ?? row.guests, 2)));

    bookings.push({
      id: `csv-${Date.now()}-${index}`,
      listingId,
      source: row.source === 'booking' ? 'booking' : 'airbnb',
      checkIn,
      checkOut,
      nights,
      totalRevenue,
      pricePerNight: Math.round(totalRevenue / nights),
      guestCount,
      status: 'completed',
      importedFrom: 'csv',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  });

  return bookings;
}
