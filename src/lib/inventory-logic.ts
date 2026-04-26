import type {
  InventoryCategory,
  InventoryItem,
  InventoryItemWithRelations,
  InventoryMovementCreateInput,
  InventorySummary,
} from '../types/inventory';

type InventoryStock = Pick<InventoryItem, 'current_stock'>;
type InventoryThresholdStock = Pick<InventoryItem, 'current_stock' | 'min_threshold'>;
type InventoryMovementPayload = Pick<InventoryMovementCreateInput, 'movement_type' | 'quantity'>;

export function isLowStock(item: InventoryThresholdStock): boolean {
  return item.min_threshold > 0 && item.current_stock < item.min_threshold;
}

export function isCritical(item: Pick<InventoryItem, 'current_stock'>): boolean {
  return item.current_stock === 0;
}

export function isOutOfStock(item: Pick<InventoryItem, 'current_stock'>): boolean {
  return item.current_stock === 0;
}

export function computeInventorySummary(items: readonly InventoryItemWithRelations[]): InventorySummary {
  let totalUnits = 0;
  let lowStockCount = 0;
  let criticalCount = 0;
  let totalValue = 0;

  items.forEach((item) => {
    totalUnits += item.current_stock;
    if (isLowStock(item)) lowStockCount += 1;
    if (isCritical(item)) criticalCount += 1;
    if (item.unit_cost != null && Number.isFinite(item.unit_cost)) {
      totalValue += item.current_stock * item.unit_cost;
    }
  });

  return {
    totalItems: items.length,
    totalUnits,
    lowStockCount,
    criticalCount,
    totalValue,
  };
}

export function applyMovement(
  item: InventoryStock,
  movement: InventoryMovementPayload,
): InventoryStock | null {
  if (!Number.isFinite(movement.quantity) || movement.quantity <= 0) return null;

  let nextStock = item.current_stock;

  switch (movement.movement_type) {
    case 'restock':
      nextStock += movement.quantity;
      break;
    case 'consume':
    case 'transfer':
    case 'loss':
      nextStock -= movement.quantity;
      break;
    case 'adjust':
      nextStock = movement.quantity;
      break;
    default:
      return null;
  }

  if (nextStock < 0) return null;
  return { current_stock: nextStock };
}

export function validateMovement(
  item: InventoryStock,
  movement: InventoryMovementPayload,
): 'notEnoughStock' | 'quantityRequired' | null {
  if (!Number.isFinite(movement.quantity) || movement.quantity <= 0) {
    return 'quantityRequired';
  }

  if (
    (movement.movement_type === 'consume'
      || movement.movement_type === 'transfer'
      || movement.movement_type === 'loss')
    && item.current_stock < movement.quantity
  ) {
    return 'notEnoughStock';
  }

  return null;
}

export function categoryWeight(category: InventoryCategory): number {
  switch (category) {
    case 'toiletries':
      return 0;
    case 'paper':
      return 1;
    case 'kitchen':
      return 2;
    case 'cleaning_supplies':
      return 3;
    case 'first_aid':
      return 4;
    case 'electronics':
      return 5;
    case 'snacks':
      return 6;
    case 'beverages':
      return 7;
    case 'other':
      return 8;
    default:
      return 9;
  }
}

export function sortInventoryItems<T extends InventoryItemWithRelations>(items: readonly T[]): T[] {
  return items.slice().sort((a, b) => {
    const criticalDiff = Number(isCritical(b)) - Number(isCritical(a));
    if (criticalDiff !== 0) return criticalDiff;

    const lowDiff = Number(isLowStock(b)) - Number(isLowStock(a));
    if (lowDiff !== 0) return lowDiff;

    const propertyA = (a.property_name ?? '').trim();
    const propertyB = (b.property_name ?? '').trim();
    if (propertyA === '' && propertyB !== '') return 1;
    if (propertyA !== '' && propertyB === '') return -1;

    const propertyDiff = propertyA.localeCompare(propertyB, 'fr-FR');
    if (propertyDiff !== 0) return propertyDiff;

    const categoryDiff = categoryWeight(a.category) - categoryWeight(b.category);
    if (categoryDiff !== 0) return categoryDiff;

    const nameDiff = a.name.localeCompare(b.name, 'fr-FR');
    if (nameDiff !== 0) return nameDiff;

    return a.id.localeCompare(b.id);
  });
}

export function formatStock(item: Pick<InventoryItem, 'current_stock' | 'unit'>): string {
  return `${item.current_stock} ${item.unit}`;
}
