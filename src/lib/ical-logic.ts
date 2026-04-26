import type { IcalFeed, IcalPlatform, ParsedIcalEvent } from '../types/ical';

export interface ReservationImportInput {
  external_uid: string;
  external_source: IcalPlatform;
  external_feed_id: string;
  property_id: string;
  check_in_date: string;
  check_out_date: string;
  status: 'pending';
  booking_reference: string;
  number_of_guests: number;
  notes: string | null;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function ymdFromParts(year: number, month: number, day: number): string {
  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function unescapeIcalText(value: string): string {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

function unfoldLines(text: string): string[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const unfolded: string[] = [];

  lines.forEach((line) => {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
      return;
    }
    unfolded.push(line);
  });

  return unfolded;
}

function parsePropertyLine(line: string): { key: string; value: string } | null {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex < 0) return null;

  const keyWithParams = line.slice(0, separatorIndex).trim();
  const value = line.slice(separatorIndex + 1);
  if (!keyWithParams) return null;

  const key = keyWithParams.split(';')[0]?.trim().toUpperCase();
  if (!key) return null;

  return { key, value };
}

export function extractDateOnly(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const compactMatch = trimmed.match(/^(\d{8})(?:T\d{6}(?:Z|[+-]\d{4})?)?$/);
  if (compactMatch) {
    const compact = compactMatch[1];
    const year = Number(compact.slice(0, 4));
    const month = Number(compact.slice(4, 6));
    const day = Number(compact.slice(6, 8));
    if (!isValidDateParts(year, month, day)) return null;
    return ymdFromParts(year, month, day);
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (!isValidDateParts(year, month, day)) return null;
    return ymdFromParts(year, month, day);
  }

  return null;
}

export function parseIcal(text: string): ParsedIcalEvent[] {
  if (!text.trim()) return [];

  const unfolded = unfoldLines(text);
  const events: ParsedIcalEvent[] = [];
  let inEvent = false;
  let currentLines: string[] = [];

  unfolded.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    const upper = line.toUpperCase();

    if (upper === 'BEGIN:VEVENT') {
      inEvent = true;
      currentLines = [];
      return;
    }

    if (upper === 'END:VEVENT') {
      if (!inEvent) return;

      const raw: Record<string, string> = {};
      currentLines.forEach((eventLine) => {
        const parsed = parsePropertyLine(eventLine);
        if (!parsed) return;
        raw[parsed.key] = parsed.value;
      });

      const uid = raw.UID?.trim();
      const dtstart = extractDateOnly(raw.DTSTART ?? '');
      const dtend = extractDateOnly(raw.DTEND ?? '') ?? dtstart;

      if (!uid || !dtstart || !dtend) {
        inEvent = false;
        currentLines = [];
        return;
      }

      events.push({
        uid,
        summary: raw.SUMMARY ? unescapeIcalText(raw.SUMMARY) : undefined,
        dtstart,
        dtend,
        status: raw.STATUS ? unescapeIcalText(raw.STATUS) : undefined,
        raw,
      });

      inEvent = false;
      currentLines = [];
      return;
    }

    if (inEvent) {
      currentLines.push(line);
    }
  });

  return events;
}

export function eventToReservationInput(
  event: ParsedIcalEvent,
  feed: Pick<IcalFeed, 'id' | 'platform' | 'property_id'>,
  fallbackPropertyId: string,
): ReservationImportInput | null {
  const checkInDate = extractDateOnly(event.dtstart);
  const checkOutDate = extractDateOnly(event.dtend);
  if (!checkInDate || !checkOutDate) return null;

  if (checkOutDate <= checkInDate) return null;

  const summary = event.summary?.trim();
  const bookingReference = (summary ? summary.slice(0, 40) : '') || event.uid.slice(0, 12);

  return {
    external_uid: event.uid,
    external_source: feed.platform,
    external_feed_id: feed.id,
    property_id: feed.property_id || fallbackPropertyId,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    status: 'pending',
    booking_reference: bookingReference,
    number_of_guests: 1,
    notes: event.status ? `iCal STATUS: ${event.status}` : null,
  };
}

export function diffSync(
  parsed: ParsedIcalEvent[],
  existing: { external_uid: string }[],
): { toImport: ParsedIcalEvent[]; toSkip: ParsedIcalEvent[] } {
  const existingUids = new Set(
    existing
      .map((entry) => entry.external_uid.trim())
      .filter((value) => value.length > 0),
  );

  const seen = new Set<string>();
  const toImport: ParsedIcalEvent[] = [];
  const toSkip: ParsedIcalEvent[] = [];

  parsed.forEach((event) => {
    const uid = event.uid.trim();
    if (!uid || existingUids.has(uid) || seen.has(uid)) {
      toSkip.push(event);
      return;
    }

    seen.add(uid);
    toImport.push(event);
  });

  return { toImport, toSkip };
}

export function formatPlatform(platform: IcalPlatform): string {
  const map: Record<IcalPlatform, string> = {
    airbnb: 'ical.platform.airbnb',
    booking: 'ical.platform.booking',
    vrbo: 'ical.platform.vrbo',
    other: 'ical.platform.other',
  };
  return map[platform];
}

export function nextSyncDue(feed: IcalFeed, now: Date): boolean {
  if (!feed.last_sync_at) return true;

  const lastSyncAt = new Date(feed.last_sync_at);
  if (Number.isNaN(lastSyncAt.getTime())) return true;

  const elapsedMs = now.getTime() - lastSyncAt.getTime();
  return elapsedMs >= feed.sync_interval_minutes * 60 * 1000;
}
