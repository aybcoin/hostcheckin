import Dexie, { type Table } from 'dexie';
import type {
  Booking,
  Competitor,
  DailyPricing,
  Listing,
  LocalEvent,
  PricingDecision,
  PricingSettings,
} from '../types';

export class RentIQDatabase extends Dexie {
  listings!: Table<Listing, string>;
  bookings!: Table<Booking, string>;
  competitors!: Table<Competitor, string>;
  events!: Table<LocalEvent, string>;
  dailyPricing!: Table<DailyPricing, string>;
  decisions!: Table<PricingDecision, string>;
  settings!: Table<PricingSettings, string>;

  constructor() {
    super('RentIQMarocDB');

    this.version(1).stores({
      listings: 'id, zone, positioning',
      bookings: 'id, listingId, checkIn, checkOut, status',
      competitors: 'id, zone, capacity, positioning',
      events: 'id, startDate, endDate, *zonesImpacted',
      dailyPricing: 'id, listingId, date, decision, demandScore, riskScore',
      decisions: 'id, listingId, date, appliedAt',
      settings: 'id, listingId',
    });
  }
}

export const rentiqDb = new RentIQDatabase();
