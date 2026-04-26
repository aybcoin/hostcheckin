import type {
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceSummary,
  MaintenanceTicket,
  MaintenanceTicketWithRelations,
} from '../types/maintenance';

const OPEN_STATUSES: ReadonlyArray<MaintenanceStatus> = ['open', 'in_progress', 'waiting_parts'];
const CLOSED_STATUSES: ReadonlyArray<MaintenanceStatus> = ['resolved', 'closed'];

export function isOpenTicketStatus(status: MaintenanceStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export function isClosedTicketStatus(status: MaintenanceStatus): boolean {
  return CLOSED_STATUSES.includes(status);
}

/**
 * Numeric weight for priority sorting. Lower is more urgent.
 */
export function priorityWeight(priority: MaintenancePriority): number {
  switch (priority) {
    case 'urgent':
      return 0;
    case 'high':
      return 1;
    case 'normal':
      return 2;
    case 'low':
      return 3;
    default:
      return 2;
  }
}

/**
 * Numeric weight for status sorting (open first). Lower comes first.
 */
export function statusWeight(status: MaintenanceStatus): number {
  switch (status) {
    case 'open':
      return 0;
    case 'in_progress':
      return 1;
    case 'waiting_parts':
      return 2;
    case 'resolved':
      return 3;
    case 'closed':
      return 4;
    default:
      return 5;
  }
}

export type TicketTransition = 'start' | 'wait_parts' | 'resolve' | 'close' | 'reopen';

/**
 * State machine for ticket transitions. Returns the next status, or null if invalid.
 */
export function nextTicketStatusFor(
  ticket: Pick<MaintenanceTicket, 'status'>,
  transition: TicketTransition,
): MaintenanceStatus | null {
  switch (transition) {
    case 'start':
      if (ticket.status === 'open' || ticket.status === 'waiting_parts') return 'in_progress';
      return null;
    case 'wait_parts':
      if (ticket.status === 'open' || ticket.status === 'in_progress') return 'waiting_parts';
      return null;
    case 'resolve':
      if (
        ticket.status === 'open'
        || ticket.status === 'in_progress'
        || ticket.status === 'waiting_parts'
      ) {
        return 'resolved';
      }
      return null;
    case 'close':
      if (ticket.status === 'resolved') return 'closed';
      return null;
    case 'reopen':
      if (ticket.status === 'resolved' || ticket.status === 'closed') return 'in_progress';
      return null;
    default:
      return null;
  }
}

export function computeMaintenanceSummary(
  tickets: readonly MaintenanceTicketWithRelations[],
): MaintenanceSummary {
  let open = 0;
  let inProgress = 0;
  let waitingParts = 0;
  let resolved = 0;
  let closed = 0;
  let urgent = 0;
  let totalCostActual = 0;

  tickets.forEach((ticket) => {
    if (ticket.status === 'open') open += 1;
    else if (ticket.status === 'in_progress') inProgress += 1;
    else if (ticket.status === 'waiting_parts') waitingParts += 1;
    else if (ticket.status === 'resolved') resolved += 1;
    else if (ticket.status === 'closed') closed += 1;

    if (ticket.priority === 'urgent' && isOpenTicketStatus(ticket.status)) {
      urgent += 1;
    }

    if (ticket.cost_actual && Number.isFinite(ticket.cost_actual)) {
      totalCostActual += ticket.cost_actual;
    }
  });

  return {
    open,
    inProgress,
    waitingParts,
    resolved,
    closed,
    urgent,
    totalCostActual: Math.round(totalCostActual * 100) / 100,
  };
}

/**
 * Sort tickets by status (open first), then priority (urgent first), then reported_at desc.
 * Returns a new array; does not mutate input.
 */
export function sortTickets<T extends MaintenanceTicketWithRelations>(
  tickets: readonly T[],
): T[] {
  return tickets.slice().sort((a, b) => {
    const sdiff = statusWeight(a.status) - statusWeight(b.status);
    if (sdiff !== 0) return sdiff;
    const pdiff = priorityWeight(a.priority) - priorityWeight(b.priority);
    if (pdiff !== 0) return pdiff;
    // Most recently reported first
    return b.reported_at.localeCompare(a.reported_at);
  });
}

/**
 * Returns top N open tickets ranked urgent → high → normal → low, then most recent.
 * Used for the dashboard urgent card.
 */
export function computeUrgentTickets<T extends MaintenanceTicketWithRelations>(
  tickets: readonly T[],
  limit: number = 4,
): T[] {
  return tickets
    .filter((ticket) => isOpenTicketStatus(ticket.status))
    .filter((ticket) => ticket.priority === 'urgent' || ticket.priority === 'high')
    .slice()
    .sort((a, b) => {
      const pdiff = priorityWeight(a.priority) - priorityWeight(b.priority);
      if (pdiff !== 0) return pdiff;
      return b.reported_at.localeCompare(a.reported_at);
    })
    .slice(0, Math.max(0, limit));
}

/**
 * Re-export shared helper. Single source of truth lives in `src/lib/format.ts`.
 */
export { formatCurrency } from './format';
