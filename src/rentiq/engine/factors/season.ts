import type { Zone } from '../../types';
import { fromISODate } from '../../utils/dates';

const temaraSeasonality = [0.7, 0.78, 0.85, 0.95, 1.1, 1.2, 1.55, 1.65, 1.2, 0.95, 0.8, 0.95] as const;
const rabatSeasonality = [0.72, 0.8, 0.88, 0.98, 1.12, 1.22, 1.48, 1.58, 1.18, 0.96, 0.82, 1.0] as const;
const saleSeasonality = [0.7, 0.79, 0.86, 0.94, 1.08, 1.17, 1.45, 1.52, 1.14, 0.92, 0.79, 0.96] as const;

const zoneProfiles: Record<Zone, readonly number[]> = {
  temara: temaraSeasonality,
  rabat: rabatSeasonality,
  harhoura: temaraSeasonality,
  skhirat: temaraSeasonality,
  sale: saleSeasonality,
  oujda: [0.75, 0.8, 0.86, 0.92, 0.98, 1.05, 1.2, 1.25, 1.08, 0.95, 0.82, 0.9],
};

export function calculateSeasonFactor(date: string, zone: Zone): number {
  const month = fromISODate(date).getMonth();
  const profile = zoneProfiles[zone] ?? temaraSeasonality;
  return profile[month] ?? 1;
}
