import type { Booking, Competitor, Listing, LocalEvent, PricingAction, PricingFactor } from '../types';

export interface PricingEngineInput {
  date: string;
  today: string;
  listing: Listing;
  bookings: Booking[];
  bookingsAlreadyFiltered?: boolean;
  competitors: Competitor[];
  events: LocalEvent[];
  currentPrice: number;
}

export interface PricingEngineResult {
  listingId: string;
  date: string;
  status: 'free' | 'reserved' | 'blocked';
  basePrice: number;
  currentPrice: number;
  rawRecommendedPrice: number;
  recommendedPrice: number;
  decision: PricingAction;
  demandScore: number;
  riskScore: number;
  opportunityScore: number;
  potentialGainMad: number;
  factors: PricingFactor[];
  explanation: string;
}

export interface FactorBundle {
  season: number;
  weekend: number;
  leadTime: number;
  occupancy: number;
  competition: number;
  event: number;
  orphan: number;
  standing: number;
  localDemand: number;
}
