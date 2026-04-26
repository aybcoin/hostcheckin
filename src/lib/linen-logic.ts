import type {
  LinenItem,
  LinenItemWithRelations,
  LinenMovementCreateInput,
  LinenSummary,
  LinenType,
} from '../types/linen';

type LinenQuantities = Pick<
  LinenItem,
  'quantity_clean' | 'quantity_dirty' | 'quantity_in_laundry' | 'quantity_total'
>;

type LinenMovementPayload = Pick<LinenMovementCreateInput, 'movement_type' | 'quantity'>;

export function isLowStock(item: Pick<LinenItem, 'min_threshold' | 'quantity_clean'>): boolean {
  return item.min_threshold > 0 && item.quantity_clean < item.min_threshold;
}

export function isCritical(item: Pick<LinenItem, 'quantity_total' | 'quantity_clean'>): boolean {
  return item.quantity_total > 0 && item.quantity_clean === 0;
}

export function isOutOfStock(item: Pick<LinenItem, 'quantity_total'>): boolean {
  return item.quantity_total === 0;
}

export function computeLinenSummary(items: readonly LinenItemWithRelations[]): LinenSummary {
  let totalItems = 0;
  let totalClean = 0;
  let totalDirty = 0;
  let totalInLaundry = 0;
  let lowStockCount = 0;
  let criticalCount = 0;

  items.forEach((item) => {
    totalItems += item.quantity_total;
    totalClean += item.quantity_clean;
    totalDirty += item.quantity_dirty;
    totalInLaundry += item.quantity_in_laundry;
    if (isLowStock(item)) lowStockCount += 1;
    if (isCritical(item)) criticalCount += 1;
  });

  return {
    totalItems,
    totalClean,
    totalDirty,
    totalInLaundry,
    lowStockCount,
    criticalCount,
  };
}

export function applyMovement(
  item: LinenQuantities,
  movement: LinenMovementPayload,
): LinenQuantities | null {
  const quantity = movement.quantity;
  if (!Number.isFinite(quantity) || quantity <= 0) return null;

  const next: LinenQuantities = {
    quantity_clean: item.quantity_clean,
    quantity_dirty: item.quantity_dirty,
    quantity_in_laundry: item.quantity_in_laundry,
    quantity_total: item.quantity_total,
  };

  switch (movement.movement_type) {
    case 'use_to_dirty':
      next.quantity_clean -= quantity;
      next.quantity_dirty += quantity;
      break;
    case 'dirty_to_laundry':
      next.quantity_dirty -= quantity;
      next.quantity_in_laundry += quantity;
      break;
    case 'laundry_to_clean':
      next.quantity_in_laundry -= quantity;
      next.quantity_clean += quantity;
      break;
    case 'clean_to_use':
      next.quantity_clean -= quantity;
      break;
    case 'adjust':
      next.quantity_clean = quantity;
      break;
    case 'loss':
      next.quantity_clean -= quantity;
      next.quantity_total -= quantity;
      break;
    case 'add_stock':
      next.quantity_clean += quantity;
      next.quantity_total += quantity;
      break;
    default:
      return null;
  }

  if (
    next.quantity_clean < 0
    || next.quantity_dirty < 0
    || next.quantity_in_laundry < 0
    || next.quantity_total < 0
  ) {
    return null;
  }

  return next;
}

export function validateMovement(
  item: LinenQuantities,
  movement: LinenMovementPayload,
): 'notEnoughClean' | 'notEnoughDirty' | 'notEnoughInLaundry' | 'quantityRequired' | null {
  if (!Number.isFinite(movement.quantity) || movement.quantity <= 0) {
    return 'quantityRequired';
  }

  if (movement.movement_type === 'dirty_to_laundry' && item.quantity_dirty < movement.quantity) {
    return 'notEnoughDirty';
  }

  if (movement.movement_type === 'laundry_to_clean' && item.quantity_in_laundry < movement.quantity) {
    return 'notEnoughInLaundry';
  }

  if (
    (movement.movement_type === 'use_to_dirty'
      || movement.movement_type === 'clean_to_use'
      || movement.movement_type === 'loss')
    && item.quantity_clean < movement.quantity
  ) {
    return 'notEnoughClean';
  }

  return null;
}

export function linenTypeWeight(type: LinenType): number {
  switch (type) {
    case 'bed_sheet':
      return 0;
    case 'duvet_cover':
      return 1;
    case 'pillowcase':
      return 2;
    case 'bath_towel':
      return 3;
    case 'hand_towel':
      return 4;
    case 'bath_mat':
      return 5;
    case 'kitchen_towel':
      return 6;
    case 'tablecloth':
      return 7;
    case 'other':
      return 8;
    default:
      return 9;
  }
}

export function sortLinenItems<T extends LinenItemWithRelations>(items: readonly T[]): T[] {
  return items.slice().sort((a, b) => {
    const criticalDiff = Number(isCritical(b)) - Number(isCritical(a));
    if (criticalDiff !== 0) return criticalDiff;

    const lowDiff = Number(isLowStock(b)) - Number(isLowStock(a));
    if (lowDiff !== 0) return lowDiff;

    const propertyDiff = (a.property_name ?? '').localeCompare(b.property_name ?? '', 'fr-FR');
    if (propertyDiff !== 0) return propertyDiff;

    const typeDiff = linenTypeWeight(a.linen_type) - linenTypeWeight(b.linen_type);
    if (typeDiff !== 0) return typeDiff;

    const sizeDiff = (a.size ?? '').localeCompare(b.size ?? '', 'fr-FR');
    if (sizeDiff !== 0) return sizeDiff;

    return a.id.localeCompare(b.id);
  });
}
