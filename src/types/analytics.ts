export interface MonthlyPoint {
  month: string;
  revenue: number;
  expenses: number;
  net: number;
  prevYearRevenue: number | null;
  prevYearNet: number | null;
}

export interface OccupancyPoint {
  month: string;
  propertyId: string;
  propertyName: string;
  rate: number;
  occupiedDays: number;
  totalDays: number;
}

export interface LeadTimeBucket {
  label: string;
  count: number;
  pct: number;
}

export interface SourceBreakdown {
  source: 'manual' | 'airbnb' | 'booking' | 'vrbo' | 'other';
  count: number;
  revenue: number;
  pct: number;
}

export interface RevPAN {
  propertyId: string;
  propertyName: string;
  revenue: number;
  availableNights: number;
  revpan: number;
}

export interface KpiDelta {
  current: number;
  previous: number;
  delta: number;
  pctChange: number | null;
  trend: 'up' | 'down' | 'flat';
}

export interface AnalyticsSummary {
  revenueTrend: MonthlyPoint[];
  occupancyTrend: OccupancyPoint[];
  leadTimeDist: LeadTimeBucket[];
  sourceBreakdown: SourceBreakdown[];
  revPAN: RevPAN[];
  avgLengthOfStay: number;
  avgLeadTimeDays: number;
  kpi: {
    revenue: KpiDelta;
    occupancy: KpiDelta;
    avgStay: KpiDelta;
    reservations: KpiDelta;
  };
}
