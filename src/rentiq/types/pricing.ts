export type PricingAction = 'increase' | 'decrease' | 'hold';
export type DayStatus = 'free' | 'reserved' | 'blocked';

export interface PricingFactor {
  key:
    | 'season'
    | 'weekend'
    | 'leadTime'
    | 'occupancy'
    | 'competition'
    | 'event'
    | 'orphan'
    | 'standing'
    | 'localDemand';
  label: string;
  value: number;
  reason: string;
  impactMad: number;
}

export interface DailyPricing {
  id: string;
  listingId: string;
  date: string; // YYYY-MM-DD
  status: DayStatus;
  basePrice: number;
  currentPrice: number;
  recommendedPrice: number;
  rawRecommendedPrice: number;
  decision: PricingAction;
  demandScore: number;
  riskScore: number;
  opportunityScore: number;
  potentialGainMad: number;
  factors: PricingFactor[];
  explanation: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingRecommendation {
  id: string;
  listingId: string;
  date: string;
  action: PricingAction;
  currentPrice: number;
  recommendedPrice: number;
  potentialGainMad: number;
  demandScore: number;
  riskScore: number;
  opportunityScore: number;
  explanation: string;
  factors: PricingFactor[];
}

export interface PricingSettings {
  id: string;
  listingId: string;
  shadowMode: boolean;
  maxDailyVariationPct: number;
  cooldownHours: number;
  lastManualUpdateAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingDecision {
  id: string;
  listingId: string;
  date: string;
  action: PricingAction;
  previousPrice: number;
  nextPrice: number;
  appliedManually: boolean;
  appliedAt: string;
  createdAt: string;
}
