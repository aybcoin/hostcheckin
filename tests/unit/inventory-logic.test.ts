import { describe, expect, it } from 'vitest';
import {
  applyMovement,
  categoryWeight,
  computeInventorySummary,
  formatStock,
  isCritical,
  isLowStock,
  isOutOfStock,
  sortInventoryItems,
  validateMovement,
} from '../../src/lib/inventory-logic';
import type {
  InventoryItemWithRelations,
  InventoryMovementCreateInput,
} from '../../src/types/inventory';

const NOW_ISO = '2026-04-25T10:00:00Z';

function makeItem(overrides: Partial<InventoryItemWithRelations> = {}): InventoryItemWithRelations {
  return {
    id: 'item-1',
    host_id: 'host-1',
    property_id: 'prop-1',
    name: 'Savon liquide',
    category: 'toiletries',
    sku: 'SKU-100',
    unit: 'unit',
    current_stock: 10,
    min_threshold: 3,
    unit_cost: 2.5,
    supplier: 'Grossiste A',
    notes: null,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    property_name: 'Appartement Centre',
    last_movement_at: NOW_ISO,
    ...overrides,
  };
}

function movement(
  overrides: Partial<InventoryMovementCreateInput> = {},
): Pick<InventoryMovementCreateInput, 'movement_type' | 'quantity'> {
  return {
    inventory_item_id: 'item-1',
    movement_type: 'consume',
    quantity: 2,
    ...overrides,
  };
}

describe('applyMovement', () => {
  it('restock increments current_stock', () => {
    const next = applyMovement(makeItem({ current_stock: 4 }), movement({ movement_type: 'restock', quantity: 3 }));
    expect(next).toEqual({ current_stock: 7 });
  });

  it('consume decrements current_stock', () => {
    const next = applyMovement(makeItem({ current_stock: 8 }), movement({ movement_type: 'consume', quantity: 3 }));
    expect(next).toEqual({ current_stock: 5 });
  });

  it('transfer decrements current_stock (outgoing side only)', () => {
    const next = applyMovement(makeItem({ current_stock: 9 }), movement({ movement_type: 'transfer', quantity: 4 }));
    expect(next).toEqual({ current_stock: 5 });
  });

  it('adjust replaces current_stock with quantity', () => {
    const next = applyMovement(makeItem({ current_stock: 9 }), movement({ movement_type: 'adjust', quantity: 2 }));
    expect(next).toEqual({ current_stock: 2 });
  });

  it('loss decrements current_stock', () => {
    const next = applyMovement(makeItem({ current_stock: 5 }), movement({ movement_type: 'loss', quantity: 2 }));
    expect(next).toEqual({ current_stock: 3 });
  });

  it('returns null when consume would go negative', () => {
    const next = applyMovement(makeItem({ current_stock: 1 }), movement({ movement_type: 'consume', quantity: 2 }));
    expect(next).toBeNull();
  });

  it('returns null when transfer would go negative', () => {
    const next = applyMovement(makeItem({ current_stock: 0 }), movement({ movement_type: 'transfer', quantity: 1 }));
    expect(next).toBeNull();
  });

  it('returns null when loss would go negative', () => {
    const next = applyMovement(makeItem({ current_stock: 2 }), movement({ movement_type: 'loss', quantity: 5 }));
    expect(next).toBeNull();
  });

  it('returns null when quantity is not positive', () => {
    expect(applyMovement(makeItem(), movement({ quantity: 0 }))).toBeNull();
  });

  it('returns null when quantity is NaN', () => {
    expect(applyMovement(makeItem(), movement({ quantity: Number.NaN }))).toBeNull();
  });
});

describe('validateMovement', () => {
  it('returns quantityRequired when quantity <= 0', () => {
    expect(validateMovement(makeItem(), movement({ quantity: 0 }))).toBe('quantityRequired');
  });

  it('returns notEnoughStock for consume when stock is insufficient', () => {
    const result = validateMovement(makeItem({ current_stock: 1 }), movement({ movement_type: 'consume', quantity: 2 }));
    expect(result).toBe('notEnoughStock');
  });

  it('returns notEnoughStock for transfer when stock is insufficient', () => {
    const result = validateMovement(makeItem({ current_stock: 1 }), movement({ movement_type: 'transfer', quantity: 3 }));
    expect(result).toBe('notEnoughStock');
  });

  it('returns notEnoughStock for loss when stock is insufficient', () => {
    const result = validateMovement(makeItem({ current_stock: 0 }), movement({ movement_type: 'loss', quantity: 1 }));
    expect(result).toBe('notEnoughStock');
  });

  it('returns null for valid restock', () => {
    expect(validateMovement(makeItem({ current_stock: 0 }), movement({ movement_type: 'restock', quantity: 1 }))).toBeNull();
  });

  it('returns null for valid adjust even when current stock is 0', () => {
    expect(validateMovement(makeItem({ current_stock: 0 }), movement({ movement_type: 'adjust', quantity: 4 }))).toBeNull();
  });

  it('allows consume when quantity equals current stock', () => {
    expect(validateMovement(makeItem({ current_stock: 3 }), movement({ movement_type: 'consume', quantity: 3 }))).toBeNull();
  });
});

describe('computeInventorySummary', () => {
  it('returns zeroed summary for empty input', () => {
    expect(computeInventorySummary([])).toEqual({
      totalItems: 0,
      totalUnits: 0,
      lowStockCount: 0,
      criticalCount: 0,
      totalValue: 0,
    });
  });

  it('aggregates items and ignores null unit_cost values in totalValue', () => {
    const summary = computeInventorySummary([
      makeItem({ id: 'a', current_stock: 5, min_threshold: 6, unit_cost: 2 }),
      makeItem({ id: 'b', current_stock: 0, min_threshold: 1, unit_cost: null }),
      makeItem({ id: 'c', current_stock: 8, min_threshold: 0, unit_cost: 1.5 }),
    ]);

    expect(summary).toEqual({
      totalItems: 3,
      totalUnits: 13,
      lowStockCount: 2,
      criticalCount: 1,
      totalValue: 22,
    });
  });

  it('counts zero unit_cost as valid and keeps threshold=0 out of low-stock', () => {
    const summary = computeInventorySummary([
      makeItem({ id: 'a', current_stock: 3, min_threshold: 0, unit_cost: 0 }),
      makeItem({ id: 'b', current_stock: 2, min_threshold: 2, unit_cost: 1 }),
    ]);

    expect(summary).toEqual({
      totalItems: 2,
      totalUnits: 5,
      lowStockCount: 0,
      criticalCount: 0,
      totalValue: 2,
    });
  });
});

describe('categoryWeight', () => {
  it('keeps expected business ordering', () => {
    expect(categoryWeight('toiletries')).toBeLessThan(categoryWeight('paper'));
    expect(categoryWeight('paper')).toBeLessThan(categoryWeight('kitchen'));
    expect(categoryWeight('cleaning_supplies')).toBeLessThan(categoryWeight('first_aid'));
    expect(categoryWeight('first_aid')).toBeLessThan(categoryWeight('electronics'));
    expect(categoryWeight('snacks')).toBeLessThan(categoryWeight('beverages'));
    expect(categoryWeight('beverages')).toBeLessThan(categoryWeight('other'));
  });
});

describe('sortInventoryItems', () => {
  it('orders critical items before low stock and normal items', () => {
    const sorted = sortInventoryItems([
      makeItem({ id: 'normal', current_stock: 10, min_threshold: 2 }),
      makeItem({ id: 'low', current_stock: 1, min_threshold: 2 }),
      makeItem({ id: 'critical', current_stock: 0, min_threshold: 2 }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['critical', 'low', 'normal']);
  });

  it('places host-level shared rows (no property) after property-specific rows', () => {
    const sorted = sortInventoryItems([
      makeItem({ id: 'shared', property_id: null, property_name: undefined, current_stock: 8, min_threshold: 2 }),
      makeItem({ id: 'alpha', property_name: 'Alpha', current_stock: 8, min_threshold: 2 }),
      makeItem({ id: 'beta', property_name: 'Bêta', current_stock: 8, min_threshold: 2 }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['alpha', 'beta', 'shared']);
  });

  it('orders by category weight within same property', () => {
    const sorted = sortInventoryItems([
      makeItem({ id: 'snacks', category: 'snacks', name: 'Cookies', property_name: 'A' }),
      makeItem({ id: 'paper', category: 'paper', name: 'Serviettes', property_name: 'A' }),
      makeItem({ id: 'kitchen', category: 'kitchen', name: 'Eponge', property_name: 'A' }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['paper', 'kitchen', 'snacks']);
  });

  it('orders by name when category and property are equal', () => {
    const sorted = sortInventoryItems([
      makeItem({ id: 'b', name: 'Papier toilette', category: 'paper', property_name: 'A' }),
      makeItem({ id: 'a', name: 'Essuie-tout', category: 'paper', property_name: 'A' }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('does not mutate input array', () => {
    const original = [
      makeItem({ id: 'x', current_stock: 4 }),
      makeItem({ id: 'y', current_stock: 0 }),
    ];
    const snapshot = original.map((item) => item.id);
    sortInventoryItems(original);
    expect(original.map((item) => item.id)).toEqual(snapshot);
  });
});

describe('stock helpers', () => {
  it('isLowStock is false when threshold is 0', () => {
    expect(isLowStock(makeItem({ min_threshold: 0, current_stock: 0 }))).toBe(false);
  });

  it('isLowStock is false when current_stock equals threshold', () => {
    expect(isLowStock(makeItem({ min_threshold: 3, current_stock: 3 }))).toBe(false);
  });

  it('isLowStock is true when current_stock is below threshold', () => {
    expect(isLowStock(makeItem({ min_threshold: 3, current_stock: 2 }))).toBe(true);
  });

  it('isCritical and isOutOfStock are true when stock is 0', () => {
    expect(isCritical(makeItem({ current_stock: 0 }))).toBe(true);
    expect(isOutOfStock(makeItem({ current_stock: 0 }))).toBe(true);
  });

  it('isCritical and isOutOfStock are false when stock is above 0', () => {
    expect(isCritical(makeItem({ current_stock: 1 }))).toBe(false);
    expect(isOutOfStock(makeItem({ current_stock: 1 }))).toBe(false);
  });

  it('formatStock returns "current_stock unit"', () => {
    expect(formatStock(makeItem({ current_stock: 12, unit: 'pack' }))).toBe('12 pack');
  });
});
