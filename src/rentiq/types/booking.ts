export type BookingSource = 'airbnb' | 'booking' | 'direct' | 'manual' | 'other';
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'blocked';

export interface Booking {
  id: string;
  listingId: string;
  source: BookingSource;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  totalRevenue: number;
  pricePerNight: number;
  guestCount: number;
  status: BookingStatus;
  importedFrom: 'ical' | 'csv' | 'manual' | 'seed';
  rawSummary?: string;
  createdAt: string;
  updatedAt: string;
}
