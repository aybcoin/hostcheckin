import type { LocalEvent, Zone } from '../../types';
import { isDateInRange } from '../../utils/dates';

interface EventInput {
  date: string;
  zone: Zone;
  events: LocalEvent[];
}

export function calculateEventFactor(input: EventInput): number {
  const impactingEvents = input.events.filter(
    (event) => event.zonesImpacted.includes(input.zone) && isDateInRange(input.date, event.startDate, event.endDate),
  );

  if (impactingEvents.length === 0) return 1;

  return Math.max(...impactingEvents.map((event) => event.multiplierHint));
}

export function findEventsForDate(input: EventInput): LocalEvent[] {
  return input.events.filter(
    (event) => event.zonesImpacted.includes(input.zone) && isDateInRange(input.date, event.startDate, event.endDate),
  );
}
