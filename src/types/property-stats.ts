export interface PropertyOccupancy {
  occupiedDays: number;
  totalDays: number;
  rate: number;
}

export interface PropertyStats {
  propertyId: string;
  propertyName: string;
  city: string;
  activeReservations: number;
  nextCheckin: string | null;
  nextCheckout: string | null;
  revenueThisMonth: number;
  revenueLastMonth: number;
  occupancyThisMonth: PropertyOccupancy;
  occupancyLastMonth: PropertyOccupancy;
  pendingHousekeepingTasks: number;
  urgentMaintenanceTickets: number;
  openMaintenanceTickets: number;
}

export interface PropertyStatsSummary {
  totalProperties: number;
  totalRevenueThisMonth: number;
  avgOccupancyRate: number;
  totalPendingTasks: number;
  totalUrgentTickets: number;
}

export type PropertySortKey = 'name' | 'occupancy' | 'revenue' | 'tasks';
