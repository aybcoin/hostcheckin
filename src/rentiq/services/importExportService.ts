import type { Booking, Competitor, DailyPricing, Listing, LocalEvent, PricingDecision, PricingSettings } from '../types';
import { rentiqDb } from '../data/db';

export interface RentIQSnapshot {
  version: 1;
  exportedAt: string;
  listings: Listing[];
  bookings: Booking[];
  competitors: Competitor[];
  events: LocalEvent[];
  dailyPricing: DailyPricing[];
  decisions: PricingDecision[];
  settings: PricingSettings[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isListing(value: unknown): value is Listing {
  if (!isRecord(value)) return false;
  return isString(value.id) &&
    isString(value.name) &&
    isString(value.zone) &&
    isNumber(value.capacity) &&
    isNumber(value.bedrooms) &&
    isString(value.positioning) &&
    isNumber(value.basePrice) &&
    isNumber(value.minPrice) &&
    isNumber(value.maxPrice) &&
    isNumber(value.cleaningFee) &&
    Array.isArray(value.amenities) &&
    value.amenities.every(isString) &&
    isString(value.createdAt) &&
    isString(value.updatedAt);
}

function isBooking(value: unknown): value is Booking {
  if (!isRecord(value)) return false;
  return isString(value.id) &&
    isString(value.listingId) &&
    isString(value.source) &&
    isString(value.checkIn) &&
    isString(value.checkOut) &&
    isNumber(value.nights) &&
    isNumber(value.totalRevenue) &&
    isNumber(value.pricePerNight) &&
    isNumber(value.guestCount) &&
    isString(value.status) &&
    isString(value.importedFrom) &&
    isString(value.createdAt) &&
    isString(value.updatedAt);
}

function isCompetitor(value: unknown): value is Competitor {
  if (!isRecord(value)) return false;
  return isString(value.id) &&
    isString(value.name) &&
    isString(value.zone) &&
    isNumber(value.capacity) &&
    isString(value.positioning) &&
    isNumber(value.priceWeekday) &&
    isNumber(value.priceWeekend) &&
    isNumber(value.cleaningFee) &&
    isNumber(value.rating) &&
    Array.isArray(value.amenities) &&
    value.amenities.every(isString) &&
    Array.isArray(value.observations) &&
    isString(value.createdAt) &&
    isString(value.updatedAt);
}

function isLocalEvent(value: unknown): value is LocalEvent {
  if (!isRecord(value)) return false;
  return isString(value.id) &&
    isString(value.name) &&
    isString(value.category) &&
    isString(value.startDate) &&
    isString(value.endDate) &&
    Array.isArray(value.zonesImpacted) &&
    value.zonesImpacted.every(isString) &&
    isString(value.expectedImpact) &&
    isNumber(value.multiplierHint) &&
    isString(value.source) &&
    isString(value.createdAt) &&
    isString(value.updatedAt);
}

function isDailyPricing(value: unknown): value is DailyPricing {
  if (!isRecord(value)) return false;
  return isString(value.id) &&
    isString(value.listingId) &&
    isString(value.date) &&
    isString(value.status) &&
    isNumber(value.basePrice) &&
    isNumber(value.currentPrice) &&
    isNumber(value.recommendedPrice) &&
    isNumber(value.rawRecommendedPrice) &&
    isString(value.decision) &&
    isNumber(value.demandScore) &&
    isNumber(value.riskScore) &&
    isNumber(value.opportunityScore) &&
    isNumber(value.potentialGainMad) &&
    Array.isArray(value.factors) &&
    isString(value.explanation) &&
    isString(value.createdAt) &&
    isString(value.updatedAt);
}

function isPricingDecision(value: unknown): value is PricingDecision {
  if (!isRecord(value)) return false;
  return isString(value.id) &&
    isString(value.listingId) &&
    isString(value.date) &&
    isString(value.action) &&
    isNumber(value.previousPrice) &&
    isNumber(value.nextPrice) &&
    typeof value.appliedManually === 'boolean' &&
    isString(value.appliedAt) &&
    isString(value.createdAt);
}

function isPricingSettings(value: unknown): value is PricingSettings {
  if (!isRecord(value)) return false;
  return isString(value.id) &&
    isString(value.listingId) &&
    typeof value.shadowMode === 'boolean' &&
    isNumber(value.maxDailyVariationPct) &&
    isNumber(value.cooldownHours) &&
    isString(value.createdAt) &&
    isString(value.updatedAt);
}

function isRentIQSnapshot(value: unknown): value is RentIQSnapshot {
  if (!isRecord(value)) return false;

  return value.version === 1 &&
    isString(value.exportedAt) &&
    Array.isArray(value.listings) &&
    value.listings.every(isListing) &&
    Array.isArray(value.bookings) &&
    value.bookings.every(isBooking) &&
    Array.isArray(value.competitors) &&
    value.competitors.every(isCompetitor) &&
    Array.isArray(value.events) &&
    value.events.every(isLocalEvent) &&
    Array.isArray(value.dailyPricing) &&
    value.dailyPricing.every(isDailyPricing) &&
    Array.isArray(value.decisions) &&
    value.decisions.every(isPricingDecision) &&
    Array.isArray(value.settings) &&
    value.settings.every(isPricingSettings);
}

export async function buildSnapshot(): Promise<RentIQSnapshot> {
  const [
    listings,
    bookings,
    competitors,
    events,
    dailyPricing,
    decisions,
    settings,
  ] = await Promise.all([
    rentiqDb.listings.toArray(),
    rentiqDb.bookings.toArray(),
    rentiqDb.competitors.toArray(),
    rentiqDb.events.toArray(),
    rentiqDb.dailyPricing.toArray(),
    rentiqDb.decisions.toArray(),
    rentiqDb.settings.toArray(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    listings,
    bookings,
    competitors,
    events,
    dailyPricing,
    decisions,
    settings,
  };
}

export async function importSnapshot(snapshot: RentIQSnapshot): Promise<void> {
  if (!isRentIQSnapshot(snapshot)) {
    throw new Error('Snapshot JSON invalide ou incomplet.');
  }

  await rentiqDb.transaction(
    'rw',
    [
      rentiqDb.listings,
      rentiqDb.bookings,
      rentiqDb.competitors,
      rentiqDb.events,
      rentiqDb.dailyPricing,
      rentiqDb.decisions,
      rentiqDb.settings,
    ],
    async () => {
      await Promise.all([
        rentiqDb.listings.clear(),
        rentiqDb.bookings.clear(),
        rentiqDb.competitors.clear(),
        rentiqDb.events.clear(),
        rentiqDb.dailyPricing.clear(),
        rentiqDb.decisions.clear(),
        rentiqDb.settings.clear(),
      ]);

      if (snapshot.listings.length > 0) await rentiqDb.listings.bulkAdd(snapshot.listings);
      if (snapshot.bookings.length > 0) await rentiqDb.bookings.bulkAdd(snapshot.bookings);
      if (snapshot.competitors.length > 0) await rentiqDb.competitors.bulkAdd(snapshot.competitors);
      if (snapshot.events.length > 0) await rentiqDb.events.bulkAdd(snapshot.events);
      if (snapshot.dailyPricing.length > 0) await rentiqDb.dailyPricing.bulkAdd(snapshot.dailyPricing);
      if (snapshot.decisions.length > 0) await rentiqDb.decisions.bulkAdd(snapshot.decisions);
      if (snapshot.settings.length > 0) await rentiqDb.settings.bulkAdd(snapshot.settings);
    },
  );
}

export function downloadSnapshot(snapshot: RentIQSnapshot): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rentiq-backup-${snapshot.exportedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
