import { describe, expect, it } from 'vitest';
import {
  computeMaintenanceSummary,
  computeUrgentTickets,
  formatCurrency,
  isClosedTicketStatus,
  isOpenTicketStatus,
  nextTicketStatusFor,
  priorityWeight,
  sortTickets,
  statusWeight,
} from '../../src/lib/maintenance-logic';
import type {
  MaintenanceTicketWithRelations,
} from '../../src/types/maintenance';

function makeTicket(
  overrides: Partial<MaintenanceTicketWithRelations> = {},
): MaintenanceTicketWithRelations {
  return {
    id: 'ticket-1',
    host_id: 'host-1',
    property_id: 'prop-1',
    reservation_id: null,
    title: 'Robinet qui fuit',
    description: null,
    category: 'plumbing',
    priority: 'normal',
    status: 'open',
    assigned_to: null,
    cost_estimate: null,
    cost_actual: null,
    reported_at: '2026-04-20T10:00:00Z',
    resolved_at: null,
    closed_at: null,
    photos_urls: [],
    notes: null,
    created_at: '2026-04-20T10:00:00Z',
    updated_at: '2026-04-20T10:00:00Z',
    property_name: 'Appartement Centre',
    comments_count: 0,
    ...overrides,
  };
}

describe('isOpenTicketStatus / isClosedTicketStatus', () => {
  it('classifies open statuses', () => {
    expect(isOpenTicketStatus('open')).toBe(true);
    expect(isOpenTicketStatus('in_progress')).toBe(true);
    expect(isOpenTicketStatus('waiting_parts')).toBe(true);
  });

  it('classifies closed statuses', () => {
    expect(isClosedTicketStatus('resolved')).toBe(true);
    expect(isClosedTicketStatus('closed')).toBe(true);
  });

  it('open and closed are mutually exclusive', () => {
    (['open', 'in_progress', 'waiting_parts', 'resolved', 'closed'] as const).forEach((s) => {
      expect(isOpenTicketStatus(s) && isClosedTicketStatus(s)).toBe(false);
    });
  });
});

describe('priorityWeight / statusWeight', () => {
  it('orders priority urgent < high < normal < low', () => {
    expect(priorityWeight('urgent')).toBeLessThan(priorityWeight('high'));
    expect(priorityWeight('high')).toBeLessThan(priorityWeight('normal'));
    expect(priorityWeight('normal')).toBeLessThan(priorityWeight('low'));
  });

  it('orders status open first, closed last', () => {
    expect(statusWeight('open')).toBe(0);
    expect(statusWeight('closed')).toBe(4);
    expect(statusWeight('open')).toBeLessThan(statusWeight('in_progress'));
    expect(statusWeight('resolved')).toBeLessThan(statusWeight('closed'));
  });
});

describe('nextTicketStatusFor — state machine', () => {
  it('start: open → in_progress', () => {
    expect(nextTicketStatusFor({ status: 'open' }, 'start')).toBe('in_progress');
  });

  it('start: waiting_parts → in_progress', () => {
    expect(nextTicketStatusFor({ status: 'waiting_parts' }, 'start')).toBe('in_progress');
  });

  it('start: in_progress is invalid (already started)', () => {
    expect(nextTicketStatusFor({ status: 'in_progress' }, 'start')).toBeNull();
  });

  it('wait_parts: in_progress → waiting_parts', () => {
    expect(nextTicketStatusFor({ status: 'in_progress' }, 'wait_parts')).toBe('waiting_parts');
  });

  it('wait_parts: closed is invalid', () => {
    expect(nextTicketStatusFor({ status: 'closed' }, 'wait_parts')).toBeNull();
  });

  it('resolve: any open status → resolved', () => {
    expect(nextTicketStatusFor({ status: 'open' }, 'resolve')).toBe('resolved');
    expect(nextTicketStatusFor({ status: 'in_progress' }, 'resolve')).toBe('resolved');
    expect(nextTicketStatusFor({ status: 'waiting_parts' }, 'resolve')).toBe('resolved');
  });

  it('resolve: closed is invalid', () => {
    expect(nextTicketStatusFor({ status: 'closed' }, 'resolve')).toBeNull();
  });

  it('close: only resolved → closed', () => {
    expect(nextTicketStatusFor({ status: 'resolved' }, 'close')).toBe('closed');
    expect(nextTicketStatusFor({ status: 'open' }, 'close')).toBeNull();
  });

  it('reopen: resolved or closed → in_progress', () => {
    expect(nextTicketStatusFor({ status: 'resolved' }, 'reopen')).toBe('in_progress');
    expect(nextTicketStatusFor({ status: 'closed' }, 'reopen')).toBe('in_progress');
  });

  it('reopen: open is invalid', () => {
    expect(nextTicketStatusFor({ status: 'open' }, 'reopen')).toBeNull();
  });
});

describe('computeMaintenanceSummary', () => {
  it('returns zeros for empty input', () => {
    const summary = computeMaintenanceSummary([]);
    expect(summary).toEqual({
      open: 0,
      inProgress: 0,
      waitingParts: 0,
      resolved: 0,
      closed: 0,
      urgent: 0,
      totalCostActual: 0,
    });
  });

  it('counts each status bucket', () => {
    const tickets = [
      makeTicket({ id: 't1', status: 'open' }),
      makeTicket({ id: 't2', status: 'open' }),
      makeTicket({ id: 't3', status: 'in_progress' }),
      makeTicket({ id: 't4', status: 'waiting_parts' }),
      makeTicket({ id: 't5', status: 'resolved' }),
      makeTicket({ id: 't6', status: 'closed' }),
    ];
    const summary = computeMaintenanceSummary(tickets);
    expect(summary.open).toBe(2);
    expect(summary.inProgress).toBe(1);
    expect(summary.waitingParts).toBe(1);
    expect(summary.resolved).toBe(1);
    expect(summary.closed).toBe(1);
  });

  it('counts urgent only when open', () => {
    const tickets = [
      makeTicket({ id: 't1', priority: 'urgent', status: 'open' }),
      makeTicket({ id: 't2', priority: 'urgent', status: 'in_progress' }),
      makeTicket({ id: 't3', priority: 'urgent', status: 'closed' }),
      makeTicket({ id: 't4', priority: 'high', status: 'open' }),
    ];
    expect(computeMaintenanceSummary(tickets).urgent).toBe(2);
  });

  it('sums cost_actual ignoring null and non-finite', () => {
    const tickets = [
      makeTicket({ id: 't1', cost_actual: 120.5 }),
      makeTicket({ id: 't2', cost_actual: 80 }),
      makeTicket({ id: 't3', cost_actual: null }),
      makeTicket({ id: 't4', cost_actual: Number.NaN }),
    ];
    expect(computeMaintenanceSummary(tickets).totalCostActual).toBe(200.5);
  });
});

describe('sortTickets', () => {
  it('puts open tickets before closed tickets', () => {
    const tickets = [
      makeTicket({ id: 'closed', status: 'closed', priority: 'urgent' }),
      makeTicket({ id: 'open', status: 'open', priority: 'low' }),
    ];
    expect(sortTickets(tickets).map((t) => t.id)).toEqual(['open', 'closed']);
  });

  it('within same status, sorts urgent before normal', () => {
    const tickets = [
      makeTicket({ id: 'normal', status: 'open', priority: 'normal' }),
      makeTicket({ id: 'urgent', status: 'open', priority: 'urgent' }),
    ];
    expect(sortTickets(tickets).map((t) => t.id)).toEqual(['urgent', 'normal']);
  });

  it('within same status and priority, sorts most recent first', () => {
    const tickets = [
      makeTicket({ id: 'old', reported_at: '2026-04-10T10:00:00Z' }),
      makeTicket({ id: 'new', reported_at: '2026-04-20T10:00:00Z' }),
    ];
    expect(sortTickets(tickets).map((t) => t.id)).toEqual(['new', 'old']);
  });

  it('does not mutate the input array', () => {
    const original = [
      makeTicket({ id: 'a', status: 'closed' }),
      makeTicket({ id: 'b', status: 'open' }),
    ];
    const snapshot = original.map((t) => t.id);
    sortTickets(original);
    expect(original.map((t) => t.id)).toEqual(snapshot);
  });
});

describe('computeUrgentTickets', () => {
  it('returns only open urgent + high tickets', () => {
    const tickets = [
      makeTicket({ id: 'urg', priority: 'urgent', status: 'open' }),
      makeTicket({ id: 'high', priority: 'high', status: 'in_progress' }),
      makeTicket({ id: 'normal', priority: 'normal', status: 'open' }),
      makeTicket({ id: 'closed', priority: 'urgent', status: 'closed' }),
    ];
    const ids = computeUrgentTickets(tickets, 10).map((t) => t.id);
    expect(ids).toContain('urg');
    expect(ids).toContain('high');
    expect(ids).not.toContain('normal');
    expect(ids).not.toContain('closed');
  });

  it('respects the limit', () => {
    const tickets = Array.from({ length: 6 }).map((_, idx) =>
      makeTicket({ id: `t${idx}`, priority: 'urgent', status: 'open' }),
    );
    expect(computeUrgentTickets(tickets, 3).length).toBe(3);
  });

  it('orders urgent before high', () => {
    const tickets = [
      makeTicket({ id: 'h1', priority: 'high', status: 'open' }),
      makeTicket({ id: 'u1', priority: 'urgent', status: 'open' }),
    ];
    expect(computeUrgentTickets(tickets, 10).map((t) => t.id)).toEqual(['u1', 'h1']);
  });
});

describe('formatCurrency', () => {
  it('returns em-dash for null/undefined', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
  });

  it('formats finite numbers as EUR', () => {
    const formatted = formatCurrency(1234.56);
    // fr-FR locale uses non-breaking spaces and "€"; assert it contains the number and currency symbol
    expect(formatted).toMatch(/1\s?234,56/);
    expect(formatted).toContain('€');
  });
});
