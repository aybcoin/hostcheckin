import type { Zone } from './listing';

export interface CompetitorObservation {
  id: string;
  date: string; // YYYY-MM-DD
  observedPriceWeekday: number;
  observedPriceWeekend: number;
  occupancyHint?: 'available' | 'partially_booked' | 'fully_booked';
  notes?: string;
}

export interface Competitor {
  id: string;
  name: string;
  zone: Zone;
  capacity: number;
  positioning: 'budget' | 'standard' | 'premium' | 'luxe';
  priceWeekday: number;
  priceWeekend: number;
  cleaningFee: number;
  rating: number;
  amenities: string[];
  url?: string;
  observations: CompetitorObservation[];
  createdAt: string;
  updatedAt: string;
}
