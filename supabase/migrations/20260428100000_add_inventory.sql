-- HostCheckIn — Phase 2 Lot D — Inventory module
-- Adds inventory_items + inventory_movements tables with host-scoped RLS.

-- =========================================================================
-- TABLES
-- =========================================================================

CREATE TABLE IF NOT EXISTS inventory_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id        uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  property_id    uuid REFERENCES properties(id) ON DELETE SET NULL,

  name           text NOT NULL,
  category       text NOT NULL
                   CHECK (
                     category IN (
                       'toiletries',
                       'paper',
                       'kitchen',
                       'snacks',
                       'beverages',
                       'electronics',
                       'cleaning_supplies',
                       'first_aid',
                       'other'
                     )
                   ),
  sku            text,
  unit           text NOT NULL DEFAULT 'unit',
  current_stock  integer NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_threshold  integer NOT NULL DEFAULT 0 CHECK (min_threshold >= 0),
  unit_cost      numeric(10, 2) CHECK (unit_cost IS NULL OR unit_cost >= 0),
  supplier       text,
  notes          text,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_host_id
  ON inventory_items(host_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_property_id
  ON inventory_items(property_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category
  ON inventory_items(category);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id  uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type      text NOT NULL
                       CHECK (
                         movement_type IN (
                           'restock',
                           'consume',
                           'transfer',
                           'adjust',
                           'loss'
                         )
                       ),
  quantity           integer NOT NULL CHECK (quantity > 0),
  unit_cost_at_time  numeric(10, 2) CHECK (unit_cost_at_time IS NULL OR unit_cost_at_time >= 0),
  note               text,
  actor              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_inventory_item_id
  ON inventory_movements(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_created_at_desc
  ON inventory_movements(inventory_item_id, created_at DESC);

-- =========================================================================
-- updated_at trigger
-- =========================================================================

CREATE OR REPLACE FUNCTION set_inventory_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_inventory_items_updated_at();

-- =========================================================================
-- RLS — inventory_items
-- =========================================================================

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own inventory items" ON inventory_items;
CREATE POLICY "Hosts can read own inventory items" ON inventory_items
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can insert own inventory items" ON inventory_items;
CREATE POLICY "Hosts can insert own inventory items" ON inventory_items
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can update own inventory items" ON inventory_items;
CREATE POLICY "Hosts can update own inventory items" ON inventory_items
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = host_id)
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can delete own inventory items" ON inventory_items;
CREATE POLICY "Hosts can delete own inventory items" ON inventory_items
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = host_id);

-- =========================================================================
-- RLS — inventory_movements
-- =========================================================================

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own inventory movements" ON inventory_movements;
CREATE POLICY "Hosts can read own inventory movements" ON inventory_movements
  FOR SELECT TO authenticated
  USING (
    inventory_item_id IN (
      SELECT id FROM inventory_items WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can insert own inventory movements" ON inventory_movements;
CREATE POLICY "Hosts can insert own inventory movements" ON inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    inventory_item_id IN (
      SELECT id FROM inventory_items WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can update own inventory movements" ON inventory_movements;
CREATE POLICY "Hosts can update own inventory movements" ON inventory_movements
  FOR UPDATE TO authenticated
  USING (
    inventory_item_id IN (
      SELECT id FROM inventory_items WHERE host_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    inventory_item_id IN (
      SELECT id FROM inventory_items WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can delete own inventory movements" ON inventory_movements;
CREATE POLICY "Hosts can delete own inventory movements" ON inventory_movements
  FOR DELETE TO authenticated
  USING (
    inventory_item_id IN (
      SELECT id FROM inventory_items WHERE host_id = (SELECT auth.uid())
    )
  );
