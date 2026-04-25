import { fromISODate } from '../../utils/dates';

export function calculateWeekendFactor(date: string): number {
  const day = fromISODate(date).getDay();
  if (day === 5) return 1.1; // vendredi
  if (day === 6) return 1.25; // samedi
  if (day === 0) return 1.05; // dimanche
  return 1;
}
