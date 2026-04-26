import { describe, expect, it } from 'vitest';
import type { HousekeepingTask } from '../../src/types/housekeeping';
import type { MaintenanceTicket } from '../../src/types/maintenance';
import type { PropertyStats } from '../../src/types/property-stats';
import type { Property, Reservation } from '../../src/lib/supabase';
import {
  computeAllPropertyStats,
  computeOccupancy,
  computePortfolioSummary,
  computePropertyStats,
  formatOccupancyPct,
  sortPropertyStats,
} from '../../src/lib/property-stats-logic';

const APRIL_REFERENCE = new Date('2026-04-15T12:00:00Z');

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'prop-1',
    host_id: 'host-1',
    name: 'Appartement Atlas',
    address: '1 rue des Orangers',
    city: 'Marrakech',
    postal_code: '40000',
    country: 'Maroc',
    description: undefined,
    rooms_count: 2,
    bathrooms_count: 1,
    max_guests: 4,
    amenities: [],
    check_in_time: '15:00',
    check_out_time: '11:00',
    verification_mode: 'simple',
    auto_link_active: false,
    auto_link_regenerated_at: null,
    base_nightly_rate: 90,
    pricing_currency: 'EUR',
    image_url: undefined,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'res-1',
    property_id: 'prop-1',
    guest_id: 'guest-1',
    check_in_date: '2026-04-10',
    check_out_date: '2026-04-12',
    number_of_guests: 2,
    booking_reference: 'RES-001',
    unique_link: 'reservation-link',
    status: 'pending',
    total_amount: 120,
    verification_type: 'simple',
    verification_mode: 'simple',
    smart_lock_code: null,
    guest_rating: 5,
    cancelled_at: undefined,
    notes: null,
    external_source: null,
    external_uid: null,
    external_feed_id: null,
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-01T09:00:00Z',
    ...overrides,
  };
}

function makeTask(overrides: Partial<HousekeepingTask> = {}): HousekeepingTask {
  return {
    id: 'task-1',
    host_id: 'host-1',
    property_id: 'prop-1',
    reservation_id: null,
    status: 'pending',
    priority: 'normal',
    scheduled_for: '2026-04-15',
    due_before: null,
    assigned_to: null,
    notes: null,
    issue_note: null,
    photos_urls: [],
    started_at: null,
    completed_at: null,
    validated_at: null,
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-01T09:00:00Z',
    ...overrides,
  };
}

function makeTicket(overrides: Partial<MaintenanceTicket> = {}): MaintenanceTicket {
  return {
    id: 'ticket-1',
    host_id: 'host-1',
    property_id: 'prop-1',
    reservation_id: null,
    title: 'Fuite lavabo',
    description: null,
    category: 'plumbing',
    priority: 'normal',
    status: 'open',
    assigned_to: null,
    cost_estimate: null,
    cost_actual: null,
    reported_at: '2026-04-01T09:00:00Z',
    resolved_at: null,
    closed_at: null,
    photos_urls: [],
    notes: null,
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-01T09:00:00Z',
    ...overrides,
  };
}

function makeStat(overrides: Partial<PropertyStats> = {}): PropertyStats {
  return {
    propertyId: 'prop-1',
    propertyName: 'Appartement Atlas',
    city: 'Marrakech',
    activeReservations: 1,
    nextCheckin: '2026-04-20',
    nextCheckout: '2026-04-22',
    revenueThisMonth: 1000,
    revenueLastMonth: 800,
    occupancyThisMonth: { occupiedDays: 12, totalDays: 30, rate: 0.4 },
    occupancyLastMonth: { occupiedDays: 10, totalDays: 31, rate: 10 / 31 },
    pendingHousekeepingTasks: 2,
    urgentMaintenanceTickets: 1,
    openMaintenanceTickets: 3,
    ...overrides,
  };
}

describe('computeOccupancy', () => {
  it('counts a full month as occupied when a stay spans the entire month', () => {
    const occupancy = computeOccupancy([
      makeReservation({
        check_in_date: '2026-04-01',
        check_out_date: '2026-05-01',
      }),
    ], 2026, 4);

    expect(occupancy).toEqual({ occupiedDays: 30, totalDays: 30, rate: 1 });
  });

  it('counts only the covered days for a partial stay', () => {
    const occupancy = computeOccupancy([
      makeReservation({
        check_in_date: '2026-04-10',
        check_out_date: '2026-04-15',
      }),
    ], 2026, 4);

    expect(occupancy).toEqual({ occupiedDays: 5, totalDays: 30, rate: 5 / 30 });
  });

  it('returns zero when no reservation occupies the month', () => {
    const occupancy = computeOccupancy([], 2026, 4);
    expect(occupancy).toEqual({ occupiedDays: 0, totalDays: 30, rate: 0 });
  });

  it('does not double-count overlapping reservations', () => {
    const occupancy = computeOccupancy([
      makeReservation({ id: 'res-1', check_in_date: '2026-04-10', check_out_date: '2026-04-15' }),
      makeReservation({ id: 'res-2', check_in_date: '2026-04-12', check_out_date: '2026-04-18' }),
    ], 2026, 4);

    expect(occupancy.occupiedDays).toBe(8);
  });

  it('excludes cancelled reservations', () => {
    const occupancy = computeOccupancy([
      makeReservation({
        status: 'cancelled',
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-30',
      }),
    ], 2026, 4);

    expect(occupancy.occupiedDays).toBe(0);
  });

  it('counts only the days inside the target month for a cross-month stay', () => {
    const occupancy = computeOccupancy([
      makeReservation({
        check_in_date: '2026-03-28',
        check_out_date: '2026-04-03',
      }),
    ], 2026, 4);

    expect(occupancy.occupiedDays).toBe(2);
  });

  it('adds non-overlapping reservations together', () => {
    const occupancy = computeOccupancy([
      makeReservation({ id: 'res-1', check_in_date: '2026-04-01', check_out_date: '2026-04-03' }),
      makeReservation({ id: 'res-2', check_in_date: '2026-04-10', check_out_date: '2026-04-13' }),
    ], 2026, 4);

    expect(occupancy.occupiedDays).toBe(5);
  });

  it('uses the real number of calendar days for leap-year february', () => {
    const occupancy = computeOccupancy([
      makeReservation({
        check_in_date: '2028-02-01',
        check_out_date: '2028-03-01',
      }),
    ], 2028, 2);

    expect(occupancy).toEqual({ occupiedDays: 29, totalDays: 29, rate: 1 });
  });
});

describe('computePropertyStats', () => {
  it('counts active reservations using pending and checked_in statuses only', () => {
    const stats = computePropertyStats(
      makeProperty(),
      [
        makeReservation({ id: 'res-1', status: 'pending' }),
        makeReservation({ id: 'res-2', status: 'checked_in' }),
        makeReservation({ id: 'res-3', status: 'completed' }),
        makeReservation({ id: 'res-4', status: 'cancelled' }),
      ],
      [],
      [],
      APRIL_REFERENCE,
    );

    expect(stats.activeReservations).toBe(2);
  });

  it('sums current-month revenue using check_in_date and excludes cancelled stays', () => {
    const stats = computePropertyStats(
      makeProperty(),
      [
        makeReservation({ id: 'res-1', check_in_date: '2026-04-05', total_amount: 200, status: 'pending' }),
        makeReservation({ id: 'res-2', check_in_date: '2026-04-18', total_amount: 350, status: 'checked_in' }),
        makeReservation({ id: 'res-3', check_in_date: '2026-04-20', total_amount: 999, status: 'cancelled' }),
        makeReservation({ id: 'res-4', check_in_date: '2026-03-29', total_amount: 500 }),
      ],
      [],
      [],
      APRIL_REFERENCE,
    );

    expect(stats.revenueThisMonth).toBe(550);
  });

  it('sums last-month revenue separately', () => {
    const stats = computePropertyStats(
      makeProperty(),
      [
        makeReservation({ id: 'res-1', check_in_date: '2026-03-02', total_amount: 180 }),
        makeReservation({ id: 'res-2', check_in_date: '2026-03-20', total_amount: 220 }),
        makeReservation({ id: 'res-3', check_in_date: '2026-04-01', total_amount: 500 }),
      ],
      [],
      [],
      APRIL_REFERENCE,
    );

    expect(stats.revenueLastMonth).toBe(400);
  });

  it('computes current and previous month occupancy', () => {
    const stats = computePropertyStats(
      makeProperty(),
      [
        makeReservation({ id: 'res-1', check_in_date: '2026-04-01', check_out_date: '2026-04-04' }),
        makeReservation({ id: 'res-2', check_in_date: '2026-03-10', check_out_date: '2026-03-15' }),
      ],
      [],
      [],
      APRIL_REFERENCE,
    );

    expect(stats.occupancyThisMonth.occupiedDays).toBe(3);
    expect(stats.occupancyLastMonth.occupiedDays).toBe(5);
  });

  it('returns null nextCheckin when there is no future active reservation', () => {
    const stats = computePropertyStats(
      makeProperty(),
      [
        makeReservation({ check_in_date: '2026-04-10', check_out_date: '2026-04-12', status: 'completed' }),
      ],
      [],
      [],
      APRIL_REFERENCE,
    );

    expect(stats.nextCheckin).toBeNull();
  });

  it('picks the nearest future nextCheckin', () => {
    const stats = computePropertyStats(
      makeProperty(),
      [
        makeReservation({ id: 'res-1', check_in_date: '2026-04-20', check_out_date: '2026-04-22' }),
        makeReservation({ id: 'res-2', check_in_date: '2026-04-18', check_out_date: '2026-04-19' }),
        makeReservation({ id: 'res-3', check_in_date: '2026-04-16', check_out_date: '2026-04-17', status: 'checked_in' }),
      ],
      [],
      [],
      APRIL_REFERENCE,
    );

    expect(stats.nextCheckin).toBe('2026-04-16');
  });

  it('picks the nearest future nextCheckout', () => {
    const stats = computePropertyStats(
      makeProperty(),
      [
        makeReservation({ id: 'res-1', check_in_date: '2026-04-10', check_out_date: '2026-04-20', status: 'checked_in' }),
        makeReservation({ id: 'res-2', check_in_date: '2026-04-16', check_out_date: '2026-04-17', status: 'pending' }),
      ],
      [],
      [],
      APRIL_REFERENCE,
    );

    expect(stats.nextCheckout).toBe('2026-04-17');
  });

  it('counts only pending and in-progress housekeeping tasks for the property', () => {
    const stats = computePropertyStats(
      makeProperty(),
      [],
      [
        makeTask({ id: 'task-1', status: 'pending', property_id: 'prop-1' }),
        makeTask({ id: 'task-2', status: 'in_progress', property_id: 'prop-1' }),
        makeTask({ id: 'task-3', status: 'assigned', property_id: 'prop-1' }),
        makeTask({ id: 'task-4', status: 'pending', property_id: 'prop-2' }),
      ],
      [],
      APRIL_REFERENCE,
    );

    expect(stats.pendingHousekeepingTasks).toBe(2);
  });

  it('counts urgent and open maintenance tickets with the requested filters', () => {
    const stats = computePropertyStats(
      makeProperty(),
      [],
      [],
      [
        makeTicket({ id: 'ticket-1', priority: 'urgent', status: 'open', property_id: 'prop-1' }),
        makeTicket({ id: 'ticket-2', priority: 'urgent', status: 'resolved', property_id: 'prop-1' }),
        makeTicket({ id: 'ticket-3', priority: 'normal', status: 'waiting_parts', property_id: 'prop-1' }),
        makeTicket({ id: 'ticket-4', priority: 'urgent', status: 'open', property_id: 'prop-2' }),
      ],
      APRIL_REFERENCE,
    );

    expect(stats.urgentMaintenanceTickets).toBe(1);
    expect(stats.openMaintenanceTickets).toBe(2);
  });

  it('uses the referenceDate override for month boundaries and future dates', () => {
    const stats = computePropertyStats(
      makeProperty(),
      [
        makeReservation({ id: 'res-1', check_in_date: '2026-01-15', check_out_date: '2026-01-18', total_amount: 150 }),
        makeReservation({ id: 'res-2', check_in_date: '2025-12-28', check_out_date: '2026-01-02', total_amount: 90 }),
        makeReservation({ id: 'res-3', check_in_date: '2026-02-01', check_out_date: '2026-02-03', total_amount: 220 }),
      ],
      [],
      [],
      new Date('2026-01-20T10:00:00Z'),
    );

    expect(stats.revenueThisMonth).toBe(150);
    expect(stats.revenueLastMonth).toBe(90);
    expect(stats.nextCheckin).toBe('2026-02-01');
  });

  it('isolates reservations by property', () => {
    const stats = computePropertyStats(
      makeProperty({ id: 'prop-2' }),
      [
        makeReservation({ id: 'res-1', property_id: 'prop-1', total_amount: 600 }),
        makeReservation({ id: 'res-2', property_id: 'prop-2', total_amount: 300 }),
      ],
      [],
      [],
      APRIL_REFERENCE,
    );

    expect(stats.revenueThisMonth).toBe(300);
  });
});

describe('computeAllPropertyStats', () => {
  it('returns one stats entry per property in input order', () => {
    const stats = computeAllPropertyStats(
      [
        makeProperty({ id: 'prop-a', name: 'Alpha' }),
        makeProperty({ id: 'prop-b', name: 'Beta' }),
      ],
      [],
      [],
      [],
      APRIL_REFERENCE,
    );

    expect(stats.map((entry) => entry.propertyId)).toEqual(['prop-a', 'prop-b']);
  });

  it('keeps housekeeping and maintenance isolated per property', () => {
    const stats = computeAllPropertyStats(
      [
        makeProperty({ id: 'prop-a', name: 'Alpha' }),
        makeProperty({ id: 'prop-b', name: 'Beta' }),
      ],
      [],
      [
        makeTask({ id: 'task-a', property_id: 'prop-a', status: 'pending' }),
        makeTask({ id: 'task-b', property_id: 'prop-b', status: 'in_progress' }),
      ],
      [
        makeTicket({ id: 'ticket-a', property_id: 'prop-a', priority: 'urgent', status: 'open' }),
        makeTicket({ id: 'ticket-b', property_id: 'prop-b', priority: 'urgent', status: 'resolved' }),
      ],
      APRIL_REFERENCE,
    );

    expect(stats[0]?.pendingHousekeepingTasks).toBe(1);
    expect(stats[0]?.urgentMaintenanceTickets).toBe(1);
    expect(stats[1]?.pendingHousekeepingTasks).toBe(1);
    expect(stats[1]?.urgentMaintenanceTickets).toBe(0);
  });

  it('returns zeroed property stats when source arrays are empty', () => {
    const stats = computeAllPropertyStats([makeProperty()], [], [], [], APRIL_REFERENCE)[0];

    expect(stats).toMatchObject({
      activeReservations: 0,
      revenueThisMonth: 0,
      revenueLastMonth: 0,
      pendingHousekeepingTasks: 0,
      urgentMaintenanceTickets: 0,
      openMaintenanceTickets: 0,
    });
  });
});

describe('computePortfolioSummary', () => {
  it('returns zeros for an empty array', () => {
    expect(computePortfolioSummary([])).toEqual({
      totalProperties: 0,
      totalRevenueThisMonth: 0,
      avgOccupancyRate: 0,
      totalPendingTasks: 0,
      totalUrgentTickets: 0,
    });
  });

  it('sums totalRevenueThisMonth', () => {
    const summary = computePortfolioSummary([
      makeStat({ revenueThisMonth: 100 }),
      makeStat({ propertyId: 'prop-2', revenueThisMonth: 200 }),
    ]);

    expect(summary.totalRevenueThisMonth).toBe(300);
  });

  it('averages the occupancy rate across properties', () => {
    const summary = computePortfolioSummary([
      makeStat({ occupancyThisMonth: { occupiedDays: 15, totalDays: 30, rate: 0.5 } }),
      makeStat({ propertyId: 'prop-2', occupancyThisMonth: { occupiedDays: 30, totalDays: 30, rate: 1 } }),
    ]);

    expect(summary.avgOccupancyRate).toBe(0.75);
  });

  it('sums pending tasks and urgent tickets', () => {
    const summary = computePortfolioSummary([
      makeStat({ pendingHousekeepingTasks: 1, urgentMaintenanceTickets: 2 }),
      makeStat({ propertyId: 'prop-2', pendingHousekeepingTasks: 3, urgentMaintenanceTickets: 4 }),
    ]);

    expect(summary.totalPendingTasks).toBe(4);
    expect(summary.totalUrgentTickets).toBe(6);
  });
});

describe('sortPropertyStats', () => {
  const stats = [
    makeStat({
      propertyId: 'prop-b',
      propertyName: 'Beta',
      revenueThisMonth: 200,
      occupancyThisMonth: { occupiedDays: 9, totalDays: 30, rate: 0.3 },
      pendingHousekeepingTasks: 3,
      urgentMaintenanceTickets: 1,
    }),
    makeStat({
      propertyId: 'prop-a',
      propertyName: 'Alpha',
      revenueThisMonth: 500,
      occupancyThisMonth: { occupiedDays: 18, totalDays: 30, rate: 0.6 },
      pendingHousekeepingTasks: 1,
      urgentMaintenanceTickets: 0,
    }),
    makeStat({
      propertyId: 'prop-c',
      propertyName: 'Gamma',
      revenueThisMonth: 100,
      occupancyThisMonth: { occupiedDays: 6, totalDays: 30, rate: 0.2 },
      pendingHousekeepingTasks: 0,
      urgentMaintenanceTickets: 2,
    }),
  ];

  it('sorts by name ascending', () => {
    expect(sortPropertyStats(stats, 'name', 'asc').map((item) => item.propertyName)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('sorts by name descending', () => {
    expect(sortPropertyStats(stats, 'name', 'desc').map((item) => item.propertyName)).toEqual(['Gamma', 'Beta', 'Alpha']);
  });

  it('sorts by occupancy ascending', () => {
    expect(sortPropertyStats(stats, 'occupancy', 'asc').map((item) => item.propertyName)).toEqual(['Gamma', 'Beta', 'Alpha']);
  });

  it('sorts by occupancy descending', () => {
    expect(sortPropertyStats(stats, 'occupancy', 'desc').map((item) => item.propertyName)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('sorts by revenue ascending', () => {
    expect(sortPropertyStats(stats, 'revenue', 'asc').map((item) => item.propertyName)).toEqual(['Gamma', 'Beta', 'Alpha']);
  });

  it('sorts by revenue descending', () => {
    expect(sortPropertyStats(stats, 'revenue', 'desc').map((item) => item.propertyName)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('sorts by task pressure ascending', () => {
    expect(sortPropertyStats(stats, 'tasks', 'asc').map((item) => item.propertyName)).toEqual(['Alpha', 'Gamma', 'Beta']);
  });

  it('sorts by task pressure descending', () => {
    expect(sortPropertyStats(stats, 'tasks', 'desc').map((item) => item.propertyName)).toEqual(['Beta', 'Gamma', 'Alpha']);
  });

  it('does not mutate the original array', () => {
    const originalOrder = stats.map((item) => item.propertyName);
    void sortPropertyStats(stats, 'revenue', 'desc');
    expect(stats.map((item) => item.propertyName)).toEqual(originalOrder);
  });
});

describe('formatOccupancyPct', () => {
  it('formats 0 as 0 %', () => {
    expect(formatOccupancyPct(0)).toBe('0 %');
  });

  it('formats 1 as 100 %', () => {
    expect(formatOccupancyPct(1)).toBe('100 %');
  });

  it('rounds without decimals', () => {
    expect(formatOccupancyPct(0.333)).toBe('33 %');
  });
});
