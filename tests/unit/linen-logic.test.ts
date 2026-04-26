import { describe, expect, it } from 'vitest';
import {
  applyMovement,
  computeLinenSummary,
  isCritical,
  isLowStock,
  isOutOfStock,
  linenTypeWeight,
  sortLinenItems,
  validateMovement,
} from '../../src/lib/linen-logic';
import type {
  LinenItemWithRelations,
  LinenMovementCreateInput,
} from '../../src/types/linen';

const NOW_ISO = '2026-04-25T10:00:00Z';

function makeItem(overrides: Partial<LinenItemWithRelations> = {}): LinenItemWithRelations {
  return {
    id: 'linen-1',
    host_id: 'host-1',
    property_id: 'prop-1',
    linen_type: 'bed_sheet',
    size: null,
    quantity_total: 10,
    quantity_clean: 6,
    quantity_dirty: 3,
    quantity_in_laundry: 1,
    min_threshold: 2,
    notes: null,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    property_name: 'Appartement Centre',
    last_movement_at: NOW_ISO,
    ...overrides,
  };
}

function movement(
  overrides: Partial<LinenMovementCreateInput> = {},
): Pick<LinenMovementCreateInput, 'movement_type' | 'quantity'> {
  return {
    linen_item_id: 'linen-1',
    movement_type: 'use_to_dirty',
    quantity: 2,
    ...overrides,
  };
}

describe('applyMovement', () => {
  it('use_to_dirty moves clean to dirty', () => {
    const next = applyMovement(makeItem(), movement({ movement_type: 'use_to_dirty', quantity: 2 }));
    expect(next).toEqual({
      quantity_clean: 4,
      quantity_dirty: 5,
      quantity_in_laundry: 1,
      quantity_total: 10,
    });
  });

  it('dirty_to_laundry moves dirty to in_laundry', () => {
    const next = applyMovement(makeItem(), movement({ movement_type: 'dirty_to_laundry', quantity: 2 }));
    expect(next).toEqual({
      quantity_clean: 6,
      quantity_dirty: 1,
      quantity_in_laundry: 3,
      quantity_total: 10,
    });
  });

  it('laundry_to_clean moves in_laundry to clean', () => {
    const next = applyMovement(makeItem(), movement({ movement_type: 'laundry_to_clean', quantity: 1 }));
    expect(next).toEqual({
      quantity_clean: 7,
      quantity_dirty: 3,
      quantity_in_laundry: 0,
      quantity_total: 10,
    });
  });

  it('clean_to_use decrements clean only', () => {
    const next = applyMovement(makeItem(), movement({ movement_type: 'clean_to_use', quantity: 3 }));
    expect(next).toEqual({
      quantity_clean: 3,
      quantity_dirty: 3,
      quantity_in_laundry: 1,
      quantity_total: 10,
    });
  });

  it('adjust replaces quantity_clean only', () => {
    const next = applyMovement(makeItem(), movement({ movement_type: 'adjust', quantity: 9 }));
    expect(next).toEqual({
      quantity_clean: 9,
      quantity_dirty: 3,
      quantity_in_laundry: 1,
      quantity_total: 10,
    });
  });

  it('loss decrements clean and total', () => {
    const next = applyMovement(makeItem(), movement({ movement_type: 'loss', quantity: 2 }));
    expect(next).toEqual({
      quantity_clean: 4,
      quantity_dirty: 3,
      quantity_in_laundry: 1,
      quantity_total: 8,
    });
  });

  it('add_stock increments clean and total', () => {
    const next = applyMovement(makeItem(), movement({ movement_type: 'add_stock', quantity: 4 }));
    expect(next).toEqual({
      quantity_clean: 10,
      quantity_dirty: 3,
      quantity_in_laundry: 1,
      quantity_total: 14,
    });
  });

  it('returns null when movement would make clean negative', () => {
    const next = applyMovement(
      makeItem({ quantity_clean: 1 }),
      movement({ movement_type: 'clean_to_use', quantity: 2 }),
    );
    expect(next).toBeNull();
  });

  it('returns null when movement would make dirty negative', () => {
    const next = applyMovement(
      makeItem({ quantity_dirty: 0 }),
      movement({ movement_type: 'dirty_to_laundry', quantity: 1 }),
    );
    expect(next).toBeNull();
  });

  it('returns null when movement would make in_laundry negative', () => {
    const next = applyMovement(
      makeItem({ quantity_in_laundry: 0 }),
      movement({ movement_type: 'laundry_to_clean', quantity: 1 }),
    );
    expect(next).toBeNull();
  });

  it('returns null when movement would make total negative', () => {
    const next = applyMovement(
      makeItem({ quantity_clean: 5, quantity_total: 1 }),
      movement({ movement_type: 'loss', quantity: 2 }),
    );
    expect(next).toBeNull();
  });

  it('returns null when quantity is not positive', () => {
    expect(applyMovement(makeItem(), movement({ quantity: 0 }))).toBeNull();
  });
});

describe('validateMovement', () => {
  it('returns quantityRequired when quantity <= 0', () => {
    expect(validateMovement(makeItem(), movement({ quantity: 0 }))).toBe('quantityRequired');
  });

  it('returns notEnoughClean when clean is insufficient', () => {
    const result = validateMovement(
      makeItem({ quantity_clean: 1 }),
      movement({ movement_type: 'use_to_dirty', quantity: 2 }),
    );
    expect(result).toBe('notEnoughClean');
  });

  it('returns notEnoughDirty when dirty is insufficient', () => {
    const result = validateMovement(
      makeItem({ quantity_dirty: 0 }),
      movement({ movement_type: 'dirty_to_laundry', quantity: 1 }),
    );
    expect(result).toBe('notEnoughDirty');
  });

  it('returns notEnoughInLaundry when in_laundry is insufficient', () => {
    const result = validateMovement(
      makeItem({ quantity_in_laundry: 0 }),
      movement({ movement_type: 'laundry_to_clean', quantity: 1 }),
    );
    expect(result).toBe('notEnoughInLaundry');
  });

  it('returns null for valid movement', () => {
    expect(validateMovement(makeItem(), movement({ movement_type: 'add_stock', quantity: 1 }))).toBeNull();
  });
});

describe('computeLinenSummary', () => {
  it('returns zeros for empty input', () => {
    expect(computeLinenSummary([])).toEqual({
      totalItems: 0,
      totalClean: 0,
      totalDirty: 0,
      totalInLaundry: 0,
      lowStockCount: 0,
      criticalCount: 0,
    });
  });

  it('aggregates one item correctly', () => {
    const summary = computeLinenSummary([makeItem()]);
    expect(summary).toEqual({
      totalItems: 10,
      totalClean: 6,
      totalDirty: 3,
      totalInLaundry: 1,
      lowStockCount: 0,
      criticalCount: 0,
    });
  });

  it('aggregates multiple items and counts low/critical buckets', () => {
    const summary = computeLinenSummary([
      makeItem({ id: 'a', quantity_total: 10, quantity_clean: 0, min_threshold: 2 }),
      makeItem({ id: 'b', quantity_total: 5, quantity_clean: 1, quantity_dirty: 2, quantity_in_laundry: 2, min_threshold: 3 }),
      makeItem({ id: 'c', quantity_total: 0, quantity_clean: 0, quantity_dirty: 0, quantity_in_laundry: 0, min_threshold: 0 }),
    ]);

    expect(summary).toEqual({
      totalItems: 15,
      totalClean: 1,
      totalDirty: 5,
      totalInLaundry: 3,
      lowStockCount: 2,
      criticalCount: 1,
    });
  });
});

describe('linenTypeWeight', () => {
  it('keeps expected business ordering', () => {
    expect(linenTypeWeight('bed_sheet')).toBeLessThan(linenTypeWeight('duvet_cover'));
    expect(linenTypeWeight('duvet_cover')).toBeLessThan(linenTypeWeight('pillowcase'));
    expect(linenTypeWeight('bath_mat')).toBeLessThan(linenTypeWeight('kitchen_towel'));
    expect(linenTypeWeight('tablecloth')).toBeLessThan(linenTypeWeight('other'));
  });
});

describe('sortLinenItems', () => {
  it('orders critical items first', () => {
    const sorted = sortLinenItems([
      makeItem({ id: 'normal', quantity_total: 4, quantity_clean: 2, min_threshold: 1 }),
      makeItem({ id: 'critical', quantity_total: 4, quantity_clean: 0, min_threshold: 1 }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['critical', 'normal']);
  });

  it('orders low stock before normal when both are non-critical', () => {
    const sorted = sortLinenItems([
      makeItem({ id: 'normal', quantity_clean: 5, min_threshold: 2 }),
      makeItem({ id: 'low', quantity_clean: 1, min_threshold: 2 }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['low', 'normal']);
  });

  it('orders by property name then linen type weight', () => {
    const sorted = sortLinenItems([
      makeItem({ id: 'b2', property_name: 'Bêta', linen_type: 'pillowcase', quantity_clean: 5 }),
      makeItem({ id: 'a2', property_name: 'Alpha', linen_type: 'duvet_cover', quantity_clean: 5 }),
      makeItem({ id: 'a1', property_name: 'Alpha', linen_type: 'bed_sheet', quantity_clean: 5 }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['a1', 'a2', 'b2']);
  });

  it('does not mutate input array', () => {
    const original = [
      makeItem({ id: 'x', quantity_clean: 5 }),
      makeItem({ id: 'y', quantity_clean: 0, quantity_total: 6 }),
    ];
    const snapshot = original.map((item) => item.id);
    sortLinenItems(original);
    expect(original.map((item) => item.id)).toEqual(snapshot);
  });
});

describe('stock helpers', () => {
  it('isLowStock false when threshold is 0', () => {
    expect(isLowStock(makeItem({ min_threshold: 0, quantity_clean: 0 }))).toBe(false);
  });

  it('isLowStock false when clean equals threshold', () => {
    expect(isLowStock(makeItem({ min_threshold: 3, quantity_clean: 3 }))).toBe(false);
  });

  it('isLowStock true when clean is below threshold', () => {
    expect(isLowStock(makeItem({ min_threshold: 3, quantity_clean: 2 }))).toBe(true);
  });

  it('isCritical true only when total > 0 and clean == 0', () => {
    expect(isCritical(makeItem({ quantity_total: 5, quantity_clean: 0 }))).toBe(true);
    expect(isCritical(makeItem({ quantity_total: 0, quantity_clean: 0 }))).toBe(false);
  });

  it('isOutOfStock true only when total is 0', () => {
    expect(isOutOfStock(makeItem({ quantity_total: 0 }))).toBe(true);
    expect(isOutOfStock(makeItem({ quantity_total: 2 }))).toBe(false);
  });
});
