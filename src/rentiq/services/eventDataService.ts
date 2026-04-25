import type { EventImpactLevel, LocalEvent, LocalEventCategory, Zone } from '../types';

interface PublicHolidayItem {
  name: string;
  date: string;
  source: string;
}

interface SchoolHolidayItem {
  name: string;
  startDate: string;
  endDate: string;
  source: string;
}

interface IslamicCalendarItem {
  name: string;
  startDate: string;
  endDate: string;
  multiplierHint: number;
  source: string;
}

interface BaselineEventItem {
  name: string;
  category: string;
  startDate: string;
  endDate: string;
  zones: string[];
  multiplierHint: number;
  source: string;
}

export interface RuntimeEventLoadResult {
  events: LocalEvent[];
  warnings: string[];
}

type JsonFetcher = (path: string) => Promise<unknown>;

const ALL_ZONES: Zone[] = ['rabat', 'temara', 'sale', 'harhoura', 'skhirat', 'oujda'];

const ZONE_ALIASES: Record<string, Zone> = {
  rabat: 'rabat',
  temara: 'temara',
  'témara': 'temara',
  sale: 'sale',
  'salé': 'sale',
  harhoura: 'harhoura',
  skhirat: 'skhirat',
  oujda: 'oujda',
};

const DATA_FILES = {
  publicHolidays: '/data/ma-public-holidays.json',
  schoolHolidays: '/data/ma-school-holidays.json',
  islamicCalendar: '/data/islamic-calendar-2026.json',
  rabatBaseline: '/data/rabat-events-baseline.json',
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function inferImpact(multiplierHint: number): EventImpactLevel {
  if (multiplierHint >= 1.3) return 'extreme';
  if (multiplierHint >= 1.16) return 'high';
  if (multiplierHint >= 1.08) return 'medium';
  return 'low';
}

function asCategory(value: string, fallback: LocalEventCategory): LocalEventCategory {
  if (value === 'festival' || value === 'conference' || value === 'sport' || value === 'religious' || value === 'school_holiday' || value === 'public_holiday') {
    return value;
  }
  return fallback;
}

function normalizeZones(values: string[] | undefined, fallback: Zone[]): Zone[] {
  if (!values || values.length === 0) return fallback;
  const zones = values
    .map((value) => ZONE_ALIASES[value.trim().toLowerCase()])
    .filter((value): value is Zone => Boolean(value));
  return zones.length > 0 ? Array.from(new Set(zones)) : fallback;
}

function createEventId(scope: string, name: string, startDate: string): string {
  return `dataset:${scope}:${slugify(name)}:${startDate}`;
}

function toLocalEvent(params: {
  scope: string;
  name: string;
  category: LocalEventCategory;
  startDate: string;
  endDate: string;
  zonesImpacted: Zone[];
  multiplierHint: number;
  source: string;
  nowIso: string;
}): LocalEvent {
  return {
    id: createEventId(params.scope, params.name, params.startDate),
    name: params.name,
    category: params.category,
    startDate: params.startDate,
    endDate: params.endDate,
    zonesImpacted: params.zonesImpacted,
    expectedImpact: inferImpact(params.multiplierHint),
    multiplierHint: params.multiplierHint,
    source: params.source,
    createdAt: params.nowIso,
    updatedAt: params.nowIso,
  };
}

function parsePublicHolidayItems(payload: unknown, nowIso: string): { events: LocalEvent[]; warnings: string[] } {
  if (!Array.isArray(payload)) {
    return { events: [], warnings: ['ma-public-holidays.json: format invalide, tableau attendu.'] };
  }

  const events: LocalEvent[] = [];
  const warnings: string[] = [];

  payload.forEach((row, index) => {
    if (!isRecord(row)) {
      warnings.push(`ma-public-holidays.json: ligne ${index + 1} ignorée (objet invalide).`);
      return;
    }

    const item: Partial<PublicHolidayItem> = row;
    if (typeof item.name !== 'string' || !isIsoDate(item.date) || typeof item.source !== 'string') {
      warnings.push(`ma-public-holidays.json: ligne ${index + 1} ignorée (champs manquants/invalides).`);
      return;
    }

    events.push(
      toLocalEvent({
        scope: 'public-holiday',
        name: item.name,
        category: 'public_holiday',
        startDate: item.date,
        endDate: item.date,
        zonesImpacted: ALL_ZONES,
        multiplierHint: 1.1,
        source: item.source,
        nowIso,
      }),
    );
  });

  return { events, warnings };
}

function parseSchoolHolidayItems(payload: unknown, nowIso: string): { events: LocalEvent[]; warnings: string[] } {
  if (!Array.isArray(payload)) {
    return { events: [], warnings: ['ma-school-holidays.json: format invalide, tableau attendu.'] };
  }

  const events: LocalEvent[] = [];
  const warnings: string[] = [];

  payload.forEach((row, index) => {
    if (!isRecord(row)) {
      warnings.push(`ma-school-holidays.json: ligne ${index + 1} ignorée (objet invalide).`);
      return;
    }

    const item: Partial<SchoolHolidayItem> = row;
    if (typeof item.name !== 'string' || !isIsoDate(item.startDate) || !isIsoDate(item.endDate) || typeof item.source !== 'string') {
      warnings.push(`ma-school-holidays.json: ligne ${index + 1} ignorée (champs manquants/invalides).`);
      return;
    }

    events.push(
      toLocalEvent({
        scope: 'school-holiday',
        name: item.name,
        category: 'school_holiday',
        startDate: item.startDate,
        endDate: item.endDate,
        zonesImpacted: ALL_ZONES,
        multiplierHint: 1.16,
        source: item.source,
        nowIso,
      }),
    );
  });

  return { events, warnings };
}

function parseIslamicCalendarItems(payload: unknown, nowIso: string): { events: LocalEvent[]; warnings: string[] } {
  if (!Array.isArray(payload)) {
    return { events: [], warnings: ['islamic-calendar-2026.json: format invalide, tableau attendu.'] };
  }

  const events: LocalEvent[] = [];
  const warnings: string[] = [];

  payload.forEach((row, index) => {
    if (!isRecord(row)) {
      warnings.push(`islamic-calendar-2026.json: ligne ${index + 1} ignorée (objet invalide).`);
      return;
    }

    const item: Partial<IslamicCalendarItem> = row;
    if (
      typeof item.name !== 'string' ||
      !isIsoDate(item.startDate) ||
      !isIsoDate(item.endDate) ||
      !isFiniteNumber(item.multiplierHint) ||
      typeof item.source !== 'string'
    ) {
      warnings.push(`islamic-calendar-2026.json: ligne ${index + 1} ignorée (champs manquants/invalides).`);
      return;
    }

    events.push(
      toLocalEvent({
        scope: 'islamic',
        name: item.name,
        category: 'religious',
        startDate: item.startDate,
        endDate: item.endDate,
        zonesImpacted: ALL_ZONES,
        multiplierHint: item.multiplierHint,
        source: item.source,
        nowIso,
      }),
    );
  });

  return { events, warnings };
}

function parseBaselineEvents(payload: unknown, nowIso: string): { events: LocalEvent[]; warnings: string[] } {
  if (!Array.isArray(payload)) {
    return { events: [], warnings: ['rabat-events-baseline.json: format invalide, tableau attendu.'] };
  }

  const events: LocalEvent[] = [];
  const warnings: string[] = [];

  payload.forEach((row, index) => {
    if (!isRecord(row)) {
      warnings.push(`rabat-events-baseline.json: ligne ${index + 1} ignorée (objet invalide).`);
      return;
    }

    const item: Partial<BaselineEventItem> = row;
    if (
      typeof item.name !== 'string' ||
      typeof item.category !== 'string' ||
      !isIsoDate(item.startDate) ||
      !isIsoDate(item.endDate) ||
      !Array.isArray(item.zones) ||
      typeof item.source !== 'string'
    ) {
      warnings.push(`rabat-events-baseline.json: ligne ${index + 1} ignorée (champs manquants/invalides).`);
      return;
    }

    const multiplierHint = isFiniteNumber(item.multiplierHint) ? item.multiplierHint : 1.08;
    const zonesImpacted = normalizeZones(item.zones, ['rabat', 'temara', 'sale']);
    const category = asCategory(item.category, 'conference');

    events.push(
      toLocalEvent({
        scope: 'baseline',
        name: item.name,
        category,
        startDate: item.startDate,
        endDate: item.endDate,
        zonesImpacted,
        multiplierHint,
        source: item.source,
        nowIso,
      }),
    );
  });

  return { events, warnings };
}

async function defaultJsonFetcher(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Impossible de charger ${path}: HTTP ${response.status}`);
  }
  return response.json();
}

export function mergeRuntimeEvents(existingEvents: LocalEvent[], runtimeDatasetEvents: LocalEvent[]): LocalEvent[] {
  const runtimeIds = new Set(runtimeDatasetEvents.map((event) => event.id));
  const withoutPreviousDatasetRows = existingEvents.filter(
    (event) => !(event.id.startsWith('dataset:') && !runtimeIds.has(event.id)),
  );

  const map = new Map<string, LocalEvent>();
  withoutPreviousDatasetRows.forEach((event) => map.set(event.id, event));
  runtimeDatasetEvents.forEach((event) => map.set(event.id, event));

  return Array.from(map.values()).sort((left, right) => left.startDate.localeCompare(right.startDate));
}

export async function loadRuntimeEventsFromDatasets(fetcher: JsonFetcher = defaultJsonFetcher): Promise<RuntimeEventLoadResult> {
  const nowIso = new Date().toISOString();
  const warnings: string[] = [];

  const [publicHolidaysPayload, schoolHolidaysPayload, islamicCalendarPayload, baselinePayload] = await Promise.all([
    fetcher(DATA_FILES.publicHolidays).catch((error: unknown) => {
      warnings.push(`Chargement ${DATA_FILES.publicHolidays} échoué: ${error instanceof Error ? error.message : 'erreur inconnue'}`);
      return [];
    }),
    fetcher(DATA_FILES.schoolHolidays).catch((error: unknown) => {
      warnings.push(`Chargement ${DATA_FILES.schoolHolidays} échoué: ${error instanceof Error ? error.message : 'erreur inconnue'}`);
      return [];
    }),
    fetcher(DATA_FILES.islamicCalendar).catch((error: unknown) => {
      warnings.push(`Chargement ${DATA_FILES.islamicCalendar} échoué: ${error instanceof Error ? error.message : 'erreur inconnue'}`);
      return [];
    }),
    fetcher(DATA_FILES.rabatBaseline).catch((error: unknown) => {
      warnings.push(`Chargement ${DATA_FILES.rabatBaseline} échoué: ${error instanceof Error ? error.message : 'erreur inconnue'}`);
      return [];
    }),
  ]);

  const publicHolidayResult = parsePublicHolidayItems(publicHolidaysPayload, nowIso);
  const schoolHolidayResult = parseSchoolHolidayItems(schoolHolidaysPayload, nowIso);
  const islamicResult = parseIslamicCalendarItems(islamicCalendarPayload, nowIso);
  const baselineResult = parseBaselineEvents(baselinePayload, nowIso);

  const combined = [
    ...publicHolidayResult.events,
    ...schoolHolidayResult.events,
    ...islamicResult.events,
    ...baselineResult.events,
  ];

  const uniqueById = new Map<string, LocalEvent>();
  combined.forEach((event) => uniqueById.set(event.id, event));

  return {
    events: Array.from(uniqueById.values()).sort((left, right) => left.startDate.localeCompare(right.startDate)),
    warnings: [
      ...warnings,
      ...publicHolidayResult.warnings,
      ...schoolHolidayResult.warnings,
      ...islamicResult.warnings,
      ...baselineResult.warnings,
    ],
  };
}
