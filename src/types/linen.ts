export type LinenType =
  | 'bed_sheet'
  | 'duvet_cover'
  | 'pillowcase'
  | 'bath_towel'
  | 'hand_towel'
  | 'kitchen_towel'
  | 'bath_mat'
  | 'tablecloth'
  | 'other';

export type LinenMovementType =
  | 'use_to_dirty'
  | 'dirty_to_laundry'
  | 'laundry_to_clean'
  | 'clean_to_use'
  | 'adjust'
  | 'loss'
  | 'add_stock';

export const LINEN_TYPES = [
  'bed_sheet',
  'duvet_cover',
  'pillowcase',
  'bath_towel',
  'hand_towel',
  'kitchen_towel',
  'bath_mat',
  'tablecloth',
  'other',
] as const satisfies readonly LinenType[];

export const LINEN_MOVEMENT_TYPES = [
  'use_to_dirty',
  'dirty_to_laundry',
  'laundry_to_clean',
  'clean_to_use',
  'adjust',
  'loss',
  'add_stock',
] as const satisfies readonly LinenMovementType[];

export interface LinenItem {
  id: string;
  host_id: string;
  property_id: string;
  linen_type: LinenType;
  size: string | null;
  quantity_total: number;
  quantity_clean: number;
  quantity_dirty: number;
  quantity_in_laundry: number;
  min_threshold: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinenItemWithRelations extends LinenItem {
  property_name?: string;
  last_movement_at?: string;
}

export interface LinenMovement {
  id: string;
  linen_item_id: string;
  movement_type: LinenMovementType;
  quantity: number;
  note: string | null;
  actor: string | null;
  created_at: string;
}

export interface LinenItemCreateInput {
  property_id: string;
  linen_type: LinenType;
  size?: string | null;
  quantity_total?: number;
  quantity_clean?: number;
  quantity_dirty?: number;
  quantity_in_laundry?: number;
  min_threshold?: number;
  notes?: string | null;
}

export interface LinenMovementCreateInput {
  linen_item_id: string;
  movement_type: LinenMovementType;
  quantity: number;
  note?: string;
  actor?: string;
}

export interface LinenSummary {
  totalItems: number;
  totalClean: number;
  totalDirty: number;
  totalInLaundry: number;
  lowStockCount: number;
  criticalCount: number;
}
