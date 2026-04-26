export type InventoryCategory =
  | 'toiletries'
  | 'paper'
  | 'kitchen'
  | 'snacks'
  | 'beverages'
  | 'electronics'
  | 'cleaning_supplies'
  | 'first_aid'
  | 'other';

export type InventoryMovementType =
  | 'restock'
  | 'consume'
  | 'transfer'
  | 'adjust'
  | 'loss';

export const INVENTORY_CATEGORIES = [
  'toiletries',
  'paper',
  'kitchen',
  'snacks',
  'beverages',
  'electronics',
  'cleaning_supplies',
  'first_aid',
  'other',
] as const satisfies readonly InventoryCategory[];

export const INVENTORY_MOVEMENT_TYPES = [
  'restock',
  'consume',
  'transfer',
  'adjust',
  'loss',
] as const satisfies readonly InventoryMovementType[];

export interface InventoryItem {
  id: string;
  host_id: string;
  property_id: string | null;
  name: string;
  category: InventoryCategory;
  sku: string | null;
  unit: string;
  current_stock: number;
  min_threshold: number;
  unit_cost: number | null;
  supplier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItemWithRelations extends InventoryItem {
  property_name?: string;
  last_movement_at?: string;
}

export interface InventoryMovement {
  id: string;
  inventory_item_id: string;
  movement_type: InventoryMovementType;
  quantity: number;
  unit_cost_at_time: number | null;
  note: string | null;
  actor: string | null;
  created_at: string;
}

export interface InventoryItemCreateInput {
  property_id?: string | null;
  name: string;
  category: InventoryCategory;
  sku?: string | null;
  unit?: string;
  current_stock?: number;
  min_threshold?: number;
  unit_cost?: number | null;
  supplier?: string | null;
  notes?: string | null;
}

export interface InventoryMovementCreateInput {
  inventory_item_id: string;
  movement_type: InventoryMovementType;
  quantity: number;
  unit_cost_at_time?: number | null;
  note?: string | null;
  actor?: string | null;
}

export interface InventorySummary {
  totalItems: number;
  totalUnits: number;
  lowStockCount: number;
  criticalCount: number;
  totalValue: number;
}
