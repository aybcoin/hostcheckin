import { create } from 'zustand';
import { rentiqDb } from '../data/db';
import { ensureSeedData } from '../data/seed';
import { buildPricingRecommendations, generateDailyPricingForListing } from '../services/pricingService';
import { loadRuntimeEventsFromDatasets, mergeRuntimeEvents } from '../services/eventDataService';
import {
  buildSnapshot,
  downloadSnapshot,
  importSnapshot,
  type RentIQSnapshot,
} from '../services/importExportService';
import { parseBookingsFromCsv } from '../services/csvService';
import { parseBookingsFromIcal } from '../services/icalService';
import type {
  Booking,
  Competitor,
  DailyPricing,
  Listing,
  LocalEvent,
  PricingRecommendation,
  PricingSettings,
} from '../types';
import { toISODate } from '../utils/dates';

interface RentiqState {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  listings: Listing[];
  bookings: Booking[];
  competitors: Competitor[];
  events: LocalEvent[];
  dailyPricing: DailyPricing[];
  recommendations: PricingRecommendation[];
  settings: PricingSettings[];
  selectedListingId: string | null;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  regeneratePricing: (days?: number) => Promise<void>;
  setSelectedListing: (listingId: string) => void;
  updateListing: (listingId: string, updates: Partial<Listing>) => Promise<void>;
  updateListingAmenities: (listingId: string, amenities: string[]) => Promise<void>;
  addCompetitor: (payload: Omit<Competitor, 'id' | 'createdAt' | 'updatedAt' | 'observations'>) => Promise<void>;
  exportJson: () => Promise<void>;
  importJson: (snapshot: RentIQSnapshot) => Promise<void>;
  importCsvBookings: (csvContent: string) => Promise<number>;
  importIcalBookings: (icalContent: string) => Promise<number>;
}

async function loadAllData() {
  const [listings, bookings, competitors, events, dailyPricing, settings] = await Promise.all([
    rentiqDb.listings.toArray(),
    rentiqDb.bookings.toArray(),
    rentiqDb.competitors.toArray(),
    rentiqDb.events.toArray(),
    rentiqDb.dailyPricing.toArray(),
    rentiqDb.settings.toArray(),
  ]);

  return {
    listings,
    bookings,
    competitors,
    events,
    dailyPricing: dailyPricing.sort((left, right) => left.date.localeCompare(right.date)),
    settings,
  };
}

function defaultToday(): string {
  return toISODate(new Date());
}

async function syncRuntimeDatasets(): Promise<void> {
  const { events, warnings } = await loadRuntimeEventsFromDatasets();
  if (warnings.length > 0) {
    warnings.forEach((warning) => console.warn(`[RentIQ][datasets] ${warning}`));
  }
  if (events.length === 0) return;

  await rentiqDb.transaction('rw', [rentiqDb.events], async () => {
    const existingEvents = await rentiqDb.events.toArray();
    const mergedEvents = mergeRuntimeEvents(existingEvents, events);
    await rentiqDb.events.clear();
    if (mergedEvents.length > 0) {
      await rentiqDb.events.bulkPut(mergedEvents);
    }
  });
}

export const useRentiqStore = create<RentiqState>((set, get) => ({
  initialized: false,
  loading: false,
  error: null,
  listings: [],
  bookings: [],
  competitors: [],
  events: [],
  dailyPricing: [],
  recommendations: [],
  settings: [],
  selectedListingId: null,

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      await ensureSeedData();
      await syncRuntimeDatasets();
      const data = await loadAllData();
      const selectedListingId = data.listings[0]?.id ?? null;

      set({
        ...data,
        selectedListingId,
        recommendations: buildPricingRecommendations(data.dailyPricing, 120),
      });

      if (selectedListingId && data.dailyPricing.length === 0) {
        await get().regeneratePricing(60);
      }

      set({ initialized: true, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur d\'initialisation',
      });
    }
  },

  refresh: async () => {
    const data = await loadAllData();
    set({
      ...data,
      recommendations: buildPricingRecommendations(data.dailyPricing, 120),
    });
  },

  regeneratePricing: async (days = 60) => {
    const state = get();
    const listing = state.listings.find((candidate) => candidate.id === state.selectedListingId) ?? state.listings[0];
    if (!listing) return;
    const settings = state.settings.find((candidate) => candidate.listingId === listing.id);

    const generated = generateDailyPricingForListing({
      listing,
      bookings: state.bookings,
      competitors: state.competitors,
      events: state.events,
      startDate: defaultToday(),
      days,
      settings,
    });

    await rentiqDb.transaction('rw', [rentiqDb.dailyPricing], async () => {
      await rentiqDb.dailyPricing.where('listingId').equals(listing.id).delete();
      if (generated.length > 0) {
        await rentiqDb.dailyPricing.bulkAdd(generated);
      }
    });

    await get().refresh();
  },

  setSelectedListing: (listingId: string) => {
    set({ selectedListingId: listingId });
  },

  updateListing: async (listingId, updates) => {
    const previous = await rentiqDb.listings.get(listingId);
    if (!previous) return;
    const nowIso = new Date().toISOString();

    await rentiqDb.listings.put({
      ...previous,
      ...updates,
      updatedAt: nowIso,
    });
    const settings = await rentiqDb.settings.where('listingId').equals(listingId).first();
    if (settings) {
      await rentiqDb.settings.put({
        ...settings,
        lastManualUpdateAt: nowIso,
        updatedAt: nowIso,
      });
    }

    await get().refresh();
    await get().regeneratePricing(60);
  },

  updateListingAmenities: async (listingId, amenities) => {
    const previous = await rentiqDb.listings.get(listingId);
    if (!previous) return;
    const nowIso = new Date().toISOString();

    await rentiqDb.listings.put({
      ...previous,
      amenities,
      updatedAt: nowIso,
    });
    const settings = await rentiqDb.settings.where('listingId').equals(listingId).first();
    if (settings) {
      await rentiqDb.settings.put({
        ...settings,
        lastManualUpdateAt: nowIso,
        updatedAt: nowIso,
      });
    }

    await get().refresh();
    await get().regeneratePricing(60);
  },

  addCompetitor: async (payload) => {
    const nowIso = new Date().toISOString();
    await rentiqDb.competitors.add({
      ...payload,
      id: `competitor-${crypto.randomUUID()}`,
      observations: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    await get().refresh();
    await get().regeneratePricing(60);
  },

  exportJson: async () => {
    const snapshot = await buildSnapshot();
    downloadSnapshot(snapshot);
  },

  importJson: async (snapshot) => {
    await importSnapshot(snapshot);
    await get().refresh();
    await get().regeneratePricing(60);
  },

  importCsvBookings: async (csvContent) => {
    const listingId = get().selectedListingId ?? get().listings[0]?.id;
    if (!listingId) return 0;

    const parsed = parseBookingsFromCsv(csvContent, listingId);
    if (parsed.length > 0) {
      await rentiqDb.bookings.bulkPut(parsed);
      await get().refresh();
      await get().regeneratePricing(60);
    }

    return parsed.length;
  },

  importIcalBookings: async (icalContent) => {
    const listingId = get().selectedListingId ?? get().listings[0]?.id;
    if (!listingId) return 0;

    const parsed = parseBookingsFromIcal(icalContent, listingId);
    if (parsed.length > 0) {
      await rentiqDb.bookings.bulkPut(parsed);
      await get().refresh();
      await get().regeneratePricing(60);
    }

    return parsed.length;
  },
}));
