export type MaintenanceStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_parts'
  | 'resolved'
  | 'closed';

export type MaintenancePriority = 'low' | 'normal' | 'high' | 'urgent';

export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'appliance'
  | 'hvac'
  | 'structural'
  | 'furniture'
  | 'other';

export const MAINTENANCE_CATEGORIES = [
  'plumbing',
  'electrical',
  'appliance',
  'hvac',
  'structural',
  'furniture',
  'other',
] as const satisfies readonly MaintenanceCategory[];

export const MAINTENANCE_PRIORITIES = [
  'low',
  'normal',
  'high',
  'urgent',
] as const satisfies readonly MaintenancePriority[];

export const MAINTENANCE_STATUSES = [
  'open',
  'in_progress',
  'waiting_parts',
  'resolved',
  'closed',
] as const satisfies readonly MaintenanceStatus[];

export interface MaintenanceTicket {
  id: string;
  host_id: string;
  property_id: string;
  reservation_id: string | null;
  title: string;
  description: string | null;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to: string | null;
  cost_estimate: number | null;
  cost_actual: number | null;
  reported_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  photos_urls: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceTicketWithRelations extends MaintenanceTicket {
  property_name?: string;
  comments_count?: number;
}

export interface MaintenanceComment {
  id: string;
  ticket_id: string;
  author: string | null;
  body: string;
  created_at: string;
}

export interface MaintenanceTicketCreateInput {
  property_id: string;
  reservation_id?: string | null;
  title: string;
  description?: string | null;
  category: MaintenanceCategory;
  priority?: MaintenancePriority;
  assigned_to?: string | null;
  cost_estimate?: number | null;
  notes?: string | null;
}

export interface MaintenanceSummary {
  open: number;
  inProgress: number;
  waitingParts: number;
  resolved: number;
  closed: number;
  urgent: number;
  totalCostActual: number;
}
