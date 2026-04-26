import { describe, expect, it } from 'vitest';
import {
  diffSync,
  eventToReservationInput,
  extractDateOnly,
  formatPlatform,
  nextSyncDue,
  parseIcal,
} from '../../src/lib/ical-logic';
import type { IcalFeed, ParsedIcalEvent } from '../../src/types/ical';

function makeFeed(overrides: Partial<IcalFeed> = {}): IcalFeed {
  return {
    id: 'feed-1',
    host_id: 'host-1',
    property_id: 'property-1',
    platform: 'airbnb',
    ical_url: 'https://example.com/feed.ics',
    display_name: 'Airbnb principal',
    is_active: true,
    last_sync_at: null,
    last_sync_status: null,
    last_sync_error: null,
    last_sync_imported_count: 0,
    last_sync_skipped_count: 0,
    sync_interval_minutes: 60,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<ParsedIcalEvent> = {}): ParsedIcalEvent {
  return {
    uid: 'uid-1',
    dtstart: '2026-01-10',
    dtend: '2026-01-12',
    summary: 'Guest Booking',
    raw: {
      UID: 'uid-1',
      DTSTART: '20260110',
      DTEND: '20260112',
      SUMMARY: 'Guest Booking',
    },
    ...overrides,
  };
}

describe('extractDateOnly', () => {
  it('parses compact date-only format', () => {
    expect(extractDateOnly('20260101')).toBe('2026-01-01');
  });

  it('parses UTC datetime format', () => {
    expect(extractDateOnly('20260101T120000Z')).toBe('2026-01-01');
  });

  it('parses local datetime format', () => {
    expect(extractDateOnly('20260101T120000')).toBe('2026-01-01');
  });

  it('parses datetime with timezone offset', () => {
    expect(extractDateOnly('20260101T120000+0200')).toBe('2026-01-01');
  });

  it('parses ISO date format', () => {
    expect(extractDateOnly('2026-01-01')).toBe('2026-01-01');
  });

  it('parses ISO datetime format by keeping the date part', () => {
    expect(extractDateOnly('2026-01-01T09:30:00Z')).toBe('2026-01-01');
  });

  it('returns null for malformed values', () => {
    expect(extractDateOnly('not-a-date')).toBeNull();
  });

  it('returns null for impossible months', () => {
    expect(extractDateOnly('20261301')).toBeNull();
  });

  it('returns null for impossible days', () => {
    expect(extractDateOnly('20260231')).toBeNull();
  });

  it('returns null for empty strings', () => {
    expect(extractDateOnly('   ')).toBeNull();
  });
});

describe('parseIcal', () => {
  it('parses a simple VEVENT block', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:airbnb-1',
      'DTSTART;VALUE=DATE:20260101',
      'DTEND;VALUE=DATE:20260105',
      'SUMMARY:Reserved',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const events = parseIcal(ics);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      uid: 'airbnb-1',
      dtstart: '2026-01-01',
      dtend: '2026-01-05',
      summary: 'Reserved',
      status: 'CONFIRMED',
    });
  });

  it('parses multiple event blocks', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:event-1',
      'DTSTART:20260101T120000Z',
      'DTEND:20260103T110000Z',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:event-2',
      'DTSTART;VALUE=DATE:20260201',
      'DTEND;VALUE=DATE:20260210',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const events = parseIcal(ics);
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.uid)).toEqual(['event-1', 'event-2']);
  });

  it('supports folded lines for event fields', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:folded-1',
      'DTSTART;VALUE=DATE:20260110',
      'DTEND;VALUE=DATE:20260115',
      'SUMMARY:Reserved',
      ' by Joe',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const events = parseIcal(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.summary).toBe('Reservedby Joe');
  });

  it('skips events without UID', () => {
    const ics = [
      'BEGIN:VEVENT',
      'DTSTART;VALUE=DATE:20260101',
      'DTEND;VALUE=DATE:20260103',
      'END:VEVENT',
    ].join('\n');

    expect(parseIcal(ics)).toHaveLength(0);
  });

  it('skips events without DTSTART', () => {
    const ics = [
      'BEGIN:VEVENT',
      'UID:missing-start',
      'DTEND;VALUE=DATE:20260103',
      'END:VEVENT',
    ].join('\n');

    expect(parseIcal(ics)).toHaveLength(0);
  });

  it('handles parameterized keys and strips params', () => {
    const ics = [
      'BEGIN:VEVENT',
      'UID:param-key-1',
      'DTSTART;VALUE=DATE:20260301',
      'DTEND;TZID=Europe/Paris:20260304T120000',
      'END:VEVENT',
    ].join('\n');

    const events = parseIcal(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.dtstart).toBe('2026-03-01');
    expect(events[0]?.dtend).toBe('2026-03-04');
  });

  it('ignores non-event blocks and still parses nested calendar structure', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VTIMEZONE',
      'TZID:Europe/Paris',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:nested-1',
      'DTSTART;VALUE=DATE:20260401',
      'DTEND;VALUE=DATE:20260403',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const events = parseIcal(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.uid).toBe('nested-1');
  });

  it('supports CRLF line endings', () => {
    const ics = [
      'BEGIN:VEVENT',
      'UID:crlf-1',
      'DTSTART:20260101T120000Z',
      'DTEND:20260102T120000Z',
      'END:VEVENT',
    ].join('\r\n');

    const events = parseIcal(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.uid).toBe('crlf-1');
  });

  it('falls back dtend to dtstart when DTEND is missing', () => {
    const ics = [
      'BEGIN:VEVENT',
      'UID:no-end-1',
      'DTSTART;VALUE=DATE:20260701',
      'END:VEVENT',
    ].join('\n');

    const events = parseIcal(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.dtend).toBe('2026-07-01');
  });

  it('parses lowercase property keys', () => {
    const ics = [
      'BEGIN:VEVENT',
      'uid:lowercase-1',
      'dtstart:20260801T090000Z',
      'dtend:20260803T090000Z',
      'summary:Line\\, with comma',
      'END:VEVENT',
    ].join('\n');

    const events = parseIcal(ics);
    expect(events).toHaveLength(1);
    expect(events[0]?.summary).toBe('Line, with comma');
  });
});

describe('eventToReservationInput', () => {
  it('maps parsed event and feed to reservation payload', () => {
    const event = makeEvent({ uid: 'event-map-1', dtstart: '2026-01-10', dtend: '2026-01-12' });
    const feed = makeFeed({ id: 'feed-map-1', platform: 'booking', property_id: 'property-55' });

    const payload = eventToReservationInput(event, feed, 'fallback-property');

    expect(payload).toMatchObject({
      external_uid: 'event-map-1',
      external_source: 'booking',
      external_feed_id: 'feed-map-1',
      property_id: 'property-55',
      check_in_date: '2026-01-10',
      check_out_date: '2026-01-12',
      status: 'pending',
      number_of_guests: 1,
    });
  });

  it('truncates booking reference to 40 chars', () => {
    const summary = 'A'.repeat(64);
    const event = makeEvent({ summary });

    const payload = eventToReservationInput(event, makeFeed(), 'property-fallback');
    expect(payload?.booking_reference).toHaveLength(40);
    expect(payload?.booking_reference).toBe('A'.repeat(40));
  });

  it('falls back booking reference to UID when summary is missing', () => {
    const event = makeEvent({ uid: 'uid-1234567890abcdef', summary: undefined });

    const payload = eventToReservationInput(event, makeFeed(), 'property-fallback');
    expect(payload?.booking_reference).toBe('uid-12345678');
  });

  it('returns null when check_out_date is equal to check_in_date', () => {
    const event = makeEvent({ dtstart: '2026-01-10', dtend: '2026-01-10' });
    const payload = eventToReservationInput(event, makeFeed(), 'property-fallback');
    expect(payload).toBeNull();
  });

  it('returns null when check_out_date is before check_in_date', () => {
    const event = makeEvent({ dtstart: '2026-01-10', dtend: '2026-01-09' });
    const payload = eventToReservationInput(event, makeFeed(), 'property-fallback');
    expect(payload).toBeNull();
  });

  it('uses fallback property id when feed property id is blank', () => {
    const event = makeEvent();
    const feed = makeFeed({ property_id: '' });

    const payload = eventToReservationInput(event, feed, 'property-fallback');
    expect(payload?.property_id).toBe('property-fallback');
  });

  it('adds notes when iCal status is present', () => {
    const event = makeEvent({ status: 'CONFIRMED' });
    const payload = eventToReservationInput(event, makeFeed(), 'property-fallback');
    expect(payload?.notes).toBe('iCal STATUS: CONFIRMED');
  });
});

describe('diffSync', () => {
  it('imports only unknown UIDs', () => {
    const parsed = [
      makeEvent({ uid: 'uid-a' }),
      makeEvent({ uid: 'uid-b' }),
      makeEvent({ uid: 'uid-c' }),
    ];

    const { toImport, toSkip } = diffSync(parsed, [
      { external_uid: 'uid-a' },
      { external_uid: 'uid-c' },
    ]);

    expect(toImport.map((event) => event.uid)).toEqual(['uid-b']);
    expect(toSkip.map((event) => event.uid)).toEqual(['uid-a', 'uid-c']);
  });

  it('skips duplicate UIDs within the parsed batch after first occurrence', () => {
    const parsed = [
      makeEvent({ uid: 'dup-1', summary: 'one' }),
      makeEvent({ uid: 'dup-1', summary: 'two' }),
      makeEvent({ uid: 'dup-2' }),
    ];

    const { toImport, toSkip } = diffSync(parsed, []);

    expect(toImport.map((event) => event.uid)).toEqual(['dup-1', 'dup-2']);
    expect(toSkip.map((event) => event.summary)).toEqual(['two']);
  });

  it('keeps no overlap and preserves cardinality invariant', () => {
    const parsed = [
      makeEvent({ uid: 'a' }),
      makeEvent({ uid: 'b' }),
      makeEvent({ uid: 'b' }),
      makeEvent({ uid: 'c' }),
      makeEvent({ uid: 'd' }),
    ];

    const { toImport, toSkip } = diffSync(parsed, [{ external_uid: 'c' }]);

    const importSet = new Set(toImport.map((event) => event.uid));
    const skipSet = new Set(toSkip.map((event) => event.uid));

    expect(Array.from(importSet).every((uid) => !skipSet.has(uid) || uid === 'b')).toBe(true);
    expect(toImport.length + toSkip.length).toBe(parsed.length);
  });

  it('imports everything when existing list is empty', () => {
    const parsed = [makeEvent({ uid: 'x' }), makeEvent({ uid: 'y' })];
    const { toImport, toSkip } = diffSync(parsed, []);

    expect(toImport).toHaveLength(2);
    expect(toSkip).toHaveLength(0);
  });

  it('returns empty arrays when parsed list is empty', () => {
    const { toImport, toSkip } = diffSync([], [{ external_uid: 'x' }]);

    expect(toImport).toEqual([]);
    expect(toSkip).toEqual([]);
  });
});

describe('formatPlatform', () => {
  it('returns i18n keys for all platform values', () => {
    expect(formatPlatform('airbnb')).toBe('ical.platform.airbnb');
    expect(formatPlatform('booking')).toBe('ical.platform.booking');
    expect(formatPlatform('vrbo')).toBe('ical.platform.vrbo');
    expect(formatPlatform('other')).toBe('ical.platform.other');
  });
});

describe('nextSyncDue', () => {
  const now = new Date('2026-04-25T12:00:00.000Z');

  it('returns true when last_sync_at is null', () => {
    const feed = makeFeed({ last_sync_at: null, sync_interval_minutes: 60 });
    expect(nextSyncDue(feed, now)).toBe(true);
  });

  it('returns true exactly at interval boundary', () => {
    const feed = makeFeed({
      last_sync_at: '2026-04-25T11:00:00.000Z',
      sync_interval_minutes: 60,
    });
    expect(nextSyncDue(feed, now)).toBe(true);
  });

  it('returns false one millisecond before interval boundary', () => {
    const feed = makeFeed({
      last_sync_at: '2026-04-25T11:00:00.001Z',
      sync_interval_minutes: 60,
    });
    expect(nextSyncDue(feed, now)).toBe(false);
  });

  it('returns true one millisecond after interval boundary', () => {
    const feed = makeFeed({
      last_sync_at: '2026-04-25T10:59:59.999Z',
      sync_interval_minutes: 60,
    });
    expect(nextSyncDue(feed, now)).toBe(true);
  });

  it('returns true when last_sync_at is invalid', () => {
    const feed = makeFeed({ last_sync_at: 'not-a-date', sync_interval_minutes: 60 });
    expect(nextSyncDue(feed, now)).toBe(true);
  });
});
