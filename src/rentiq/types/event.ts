import type { Zone } from './listing';

export type LocalEventCategory =
  | 'festival'
  | 'conference'
  | 'sport'
  | 'religious'
  | 'school_holiday'
  | 'public_holiday';

export type EventImpactLevel = 'low' | 'medium' | 'high' | 'extreme';

export interface LocalEvent {
  id: string;
  name: string;
  category: LocalEventCategory;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  zonesImpacted: Zone[];
  expectedImpact: EventImpactLevel;
  multiplierHint: number;
  source: string;
  createdAt: string;
  updatedAt: string;
}
