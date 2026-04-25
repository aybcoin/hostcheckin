import type { DailyPricing, Listing, PricingAction, PricingFactor } from './index';

export type BacktestScenario = 'prudent' | 'balanced' | 'aggressive';

export interface BacktestSimulationParams {
  scenario: BacktestScenario;
  decisionLeadDays?: number;
}

export interface BacktestNightRecord {
  date: string;
  realBooked: boolean;
  realPrice: number;
  recommendedPrice: number;
  expectedBookingProbability: number;
  expectedRevenue: number;
  demandScore: number;
  riskScore: number;
  opportunityScore: number;
  decision: PricingAction;
  factors: PricingFactor[];
}

export interface BacktestOpportunityItem {
  date: string;
  realPrice: number;
  recommendedPrice: number;
  expectedGainMad: number;
  demandScore: number;
  reason: string;
}

export interface BacktestRiskItem {
  date: string;
  realPrice: number;
  recommendedPrice: number;
  expectedLossMad: number;
  riskScore: number;
  reason: string;
}

export interface BacktestScenarioResult {
  scenario: BacktestScenario;
  revenueReal: number;
  revenueSimulated: number;
  revenueDeltaMad: number;
  revenueDeltaPct: number;
  occupancyReal: number;
  occupancySimulated: number;
  adrReal: number;
  adrSimulated: number;
  revparReal: number;
  revparSimulated: number;
  increaseCount: number;
  decreaseCount: number;
  holdCount: number;
  topMissedOpportunities: BacktestOpportunityItem[];
  topRiskyDates: BacktestRiskItem[];
  diagnostic: string;
  nightRecords: BacktestNightRecord[];
}

export interface BacktestInput {
  listing: Listing;
  bookings: import('./index').Booking[];
  historicalDailyPricing?: DailyPricing[];
  competitors: import('./index').Competitor[];
  events: import('./index').LocalEvent[];
  periodStart: string;
  periodEnd: string;
  simulation: BacktestSimulationParams;
}

export interface BacktestRunInput {
  listing: Listing;
  bookings: import('./index').Booking[];
  historicalDailyPricing?: DailyPricing[];
  competitors: import('./index').Competitor[];
  events: import('./index').LocalEvent[];
  periodStart: string;
  periodEnd: string;
  simulationParams?: Omit<BacktestSimulationParams, 'scenario'>;
}

export interface BacktestRunResult {
  listingId: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  scenarios: BacktestScenarioResult[];
}

export interface CalibrationSuggestion {
  factor: 'season' | 'weekend' | 'event' | 'leadTime' | 'occupancy' | 'localDemand';
  currentAverage: number;
  recommendedAverage: number;
  justification: string;
  confidence: number;
}

export interface CalibrationReport {
  scenario: BacktestScenario;
  suggestions: CalibrationSuggestion[];
  summary: string;
}
