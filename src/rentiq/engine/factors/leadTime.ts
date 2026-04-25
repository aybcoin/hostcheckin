import { diffInDays } from '../../utils/dates';

export function calculateLeadTimeFactor(date: string, today: string): number {
  const daysUntilArrival = diffInDays(today, date);

  if (daysUntilArrival > 60) return 0.95;
  if (daysUntilArrival > 30) return 1;
  if (daysUntilArrival >= 14) return 1.05;
  if (daysUntilArrival >= 7) return 1.1;
  if (daysUntilArrival >= 3) return 1.05;
  if (daysUntilArrival >= 1) return 0.95;
  return 0.85;
}
