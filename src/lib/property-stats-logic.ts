import type { HousekeepingTask } from '../types/housekeeping';
import type { MaintenanceTicket } from '../types/maintenance';
import type { PropertyStats, PropertyStatsSummary, PropertySortKey, PropertyOccupancy } from '../types/property-stats';
import type { Property, Reservation } from './supabase';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ACTIVE_RESERVATION_STATUSES = new Set<Reservation['status']>(['pending', 'checked_in']);
const PENDING_TASK_STATUSES = new Set<HousekeepingTask['status']>(['pending', 'in_progress']);

function parseDateOnly(value: string): Date | null {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day));
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonthBounds(year: number, month: number): { start: Date; end: Date; totalDays: number } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = month === 12
    ? new Date(Date.UTC(year + 1, 0, 1))
    : new Date(Date.UTC(year, month, 1));
  const totalDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);

  return { start, end, totalDays };
}

function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }

  return { year, month: month - 1 };
}

function isDateInMonth(value: string, year: number, month: number): boolean {
  const [valueYear, valueMonth] = value.slice(0, 7).split('-').map(Number);
  return valueYear === year && valueMonth === month;
}

function toFiniteAmount(value: number | null | undefined): number {
  if (value == null) return 0;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function compareNullableDates(left: string | null, right: string | null): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left.localeCompare(right);
}

export function computeOccupancy(
  reservations: Reservation[],
  year: number,
  month: number,
): PropertyOccupancy {
  const { start, end, totalDays } = getMonthBounds(year, month);
  const occupiedDays = new Set<string>();

  reservations
    .filter((reservation) => reservation.status !== 'cancelled')
    .forEach((reservation) => {
      const reservationStart = parseDateOnly(reservation.check_in_date);
      const reservationEnd = parseDateOnly(reservation.check_out_date);

      if (!reservationStart || !reservationEnd) return;
      if (reservationEnd.getTime() <= reservationStart.getTime()) return;

      const clampedStart = reservationStart.getTime() > start.getTime() ? reservationStart : start;
      const clampedEnd = reservationEnd.getTime() < end.getTime() ? reservationEnd : end;

      if (clampedEnd.getTime() <= clampedStart.getTime()) return;

      const cursor = new Date(clampedStart);
      while (cursor.getTime() < clampedEnd.getTime()) {
        occupiedDays.add(toDateOnly(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    });

  return {
    occupiedDays: occupiedDays.size,
    totalDays,
    rate: totalDays === 0 ? 0 : occupiedDays.size / totalDays,
  };
}

export function computePropertyStats(
  property: Property,
  reservations: Reservation[],
  tasks: HousekeepingTask[],
  tickets: MaintenanceTicket[],
  referenceDate: Date = new Date(),
): PropertyStats {
  const propertyReservations = reservations.filter((reservation) => reservation.property_id === property.id);
  const propertyTasks = tasks.filter((task) => task.property_id === property.id);
  const propertyTickets = tickets.filter((ticket) => ticket.property_id === property.id);
  const currentYear = referenceDate.getUTCFullYear();
  const currentMonth = referenceDate.getUTCMonth() + 1;
  const previousPeriod = getPreviousMonth(currentYear, currentMonth);
  const referenceDateOnly = referenceDate.toISOString().slice(0, 10);

  const revenueForMonth = (year: number, month: number) =>
    propertyReservations
      .filter((reservation) => reservation.status !== 'cancelled')
      .filter((reservation) => isDateInMonth(reservation.check_in_date, year, month))
      .reduce((sum, reservation) => sum + toFiniteAmount(reservation.total_amount), 0);

  const nextCheckin = propertyReservations
    .filter((reservation) => ACTIVE_RESERVATION_STATUSES.has(reservation.status))
    .filter((reservation) => reservation.check_in_date > referenceDateOnly)
    .map((reservation) => reservation.check_in_date)
    .sort((left, right) => left.localeCompare(right))[0] ?? null;

  const nextCheckout = propertyReservations
    .filter((reservation) => ACTIVE_RESERVATION_STATUSES.has(reservation.status))
    .filter((reservation) => reservation.check_out_date > referenceDateOnly)
    .map((reservation) => reservation.check_out_date)
    .sort((left, right) => left.localeCompare(right))[0] ?? null;

  return {
    propertyId: property.id,
    propertyName: property.name,
    city: property.city || property.country,
    activeReservations: propertyReservations.filter((reservation) => ACTIVE_RESERVATION_STATUSES.has(reservation.status)).length,
    nextCheckin,
    nextCheckout,
    revenueThisMonth: revenueForMonth(currentYear, currentMonth),
    revenueLastMonth: revenueForMonth(previousPeriod.year, previousPeriod.month),
    occupancyThisMonth: computeOccupancy(propertyReservations, currentYear, currentMonth),
    occupancyLastMonth: computeOccupancy(propertyReservations, previousPeriod.year, previousPeriod.month),
    pendingHousekeepingTasks: propertyTasks.filter((task) => PENDING_TASK_STATUSES.has(task.status)).length,
    urgentMaintenanceTickets: propertyTickets.filter(
      (ticket) => ticket.priority === 'urgent' && ticket.status !== 'resolved',
    ).length,
    openMaintenanceTickets: propertyTickets.filter((ticket) => ticket.status !== 'resolved').length,
  };
}

export function computeAllPropertyStats(
  properties: Property[],
  reservations: Reservation[],
  tasks: HousekeepingTask[],
  tickets: MaintenanceTicket[],
  referenceDate: Date = new Date(),
): PropertyStats[] {
  return properties.map((property) =>
    computePropertyStats(property, reservations, tasks, tickets, referenceDate));
}

export function computePortfolioSummary(stats: PropertyStats[]): PropertyStatsSummary {
  if (stats.length === 0) {
    return {
      totalProperties: 0,
      totalRevenueThisMonth: 0,
      avgOccupancyRate: 0,
      totalPendingTasks: 0,
      totalUrgentTickets: 0,
    };
  }

  return {
    totalProperties: stats.length,
    totalRevenueThisMonth: stats.reduce((sum, item) => sum + item.revenueThisMonth, 0),
    avgOccupancyRate: stats.reduce((sum, item) => sum + item.occupancyThisMonth.rate, 0) / stats.length,
    totalPendingTasks: stats.reduce((sum, item) => sum + item.pendingHousekeepingTasks, 0),
    totalUrgentTickets: stats.reduce((sum, item) => sum + item.urgentMaintenanceTickets, 0),
  };
}

export function sortPropertyStats(
  stats: PropertyStats[],
  key: PropertySortKey,
  dir: 'asc' | 'desc',
): PropertyStats[] {
  const direction = dir === 'asc' ? 1 : -1;

  const compareByKey = (left: PropertyStats, right: PropertyStats): number => {
    switch (key) {
      case 'name':
        return left.propertyName.localeCompare(right.propertyName, 'fr-FR');
      case 'occupancy':
        return left.occupancyThisMonth.rate - right.occupancyThisMonth.rate;
      case 'revenue':
        return left.revenueThisMonth - right.revenueThisMonth;
      case 'tasks':
        return (
          left.pendingHousekeepingTasks + left.urgentMaintenanceTickets
          - (right.pendingHousekeepingTasks + right.urgentMaintenanceTickets)
        );
      default:
        return 0;
    }
  };

  return stats.slice().sort((left, right) => {
    const keyComparison = compareByKey(left, right);
    if (keyComparison !== 0) {
      return keyComparison * direction;
    }

    const nextCheckinComparison = compareNullableDates(left.nextCheckin, right.nextCheckin);
    if (nextCheckinComparison !== 0) {
      return nextCheckinComparison;
    }

    return left.propertyName.localeCompare(right.propertyName, 'fr-FR');
  });
}

export function formatOccupancyPct(rate: number): string {
  const clampedRate = Math.max(0, Math.min(1, rate));
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(clampedRate * 100)} %`;
}
