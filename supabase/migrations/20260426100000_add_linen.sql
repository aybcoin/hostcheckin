-- HostCheckIn — Phase 2 Lot B — Linen tracking module
-- Adds linen_items + linen_movements tables with RLS policies.

-- =========================================================================
-- TABLES
-- =========================================================================

CREATE TABLE IF NOT EXISTS linen_items (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id              uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  property_id          uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  linen_type           text NOT NULL
                         CHECK (
                           linen_type IN (
                             'bed_sheet',
                             'duvet_cover',
                             'pillowcase',
                             'bath_towel',
                             'hand_towel',
                             'kitchen_towel',
                             'bath_mat',
                             'tablecloth',
                             'other'
                           )
                         ),
  size                 text,
  quantity_total       integer NOT NULL DEFAULT 0 CHECK (quantity_total >= 0),
  quantity_clean       integer NOT NULL DEFAULT 0 CHECK (quantity_clean >= 0),
  quantity_dirty       integer NOT NULL DEFAULT 0 CHECK (quantity_dirty >= 0),
  quantity_in_laundry  integer NOT NULL DEFAULT 0 CHECK (quantity_in_laundry >= 0),
  min_threshold        integer NOT NULL DEFAULT 0 CHECK (min_threshold >= 0),
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_linen_items_property_type_size_unique
  ON linen_items(property_id, linen_type, COALESCE(size, ''));

CREATE INDEX IF NOT EXISTS idx_linen_items_host_id
  ON linen_items(host_id);

CREATE INDEX IF NOT EXISTS idx_linen_items_property_id
  ON linen_items(property_id);

CREATE TABLE IF NOT EXISTS linen_movements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linen_item_id  uuid NOT NULL REFERENCES linen_items(id) ON DELETE CASCADE,
  movement_type  text NOT NULL
                   CHECK (
                     movement_type IN (
                       'use_to_dirty',
                       'dirty_to_laundry',
                       'laundry_to_clean',
                       'clean_to_use',
                       'adjust',
                       'loss',
                       'add_stock'
                     )
                   ),
  quantity       integer NOT NULL CHECK (quantity > 0),
  note           text,
  actor          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_linen_movements_linen_item_id
  ON linen_movements(linen_item_id);

CREATE INDEX IF NOT EXISTS idx_linen_movements_item_created_at_desc
  ON linen_movements(linen_item_id, created_at DESC);

-- =========================================================================
-- updated_at trigger
-- =========================================================================

CREATE OR REPLACE FUNCTION set_linen_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_linen_items_updated_at ON linen_items;
CREATE TRIGGER trg_linen_items_updated_at
  BEFORE UPDATE ON linen_items
  FOR EACH ROW EXECUTE FUNCTION set_linen_items_updated_at();

-- =========================================================================
-- RLS — linen_items
-- =========================================================================

ALTER TABLE linen_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own linen items" ON linen_items;
CREATE POLICY "Hosts can read own linen items" ON linen_items
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can insert own linen items" ON linen_items;
CREATE POLICY "Hosts can insert own linen items" ON linen_items
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can update own linen items" ON linen_items;
CREATE POLICY "Hosts can update own linen items" ON linen_items
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = host_id)
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can delete own linen items" ON linen_items;
CREATE POLICY "Hosts can delete own linen items" ON linen_items
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = host_id);

-- =========================================================================
-- RLS — linen_movements
-- =========================================================================

ALTER TABLE linen_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own linen movements" ON linen_movements;
CREATE POLICY "Hosts can read own linen movements" ON linen_movements
  FOR SELECT TO authenticated
  USING (
    linen_item_id IN (
      SELECT id FROM linen_items WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can insert own linen movements" ON linen_movements;
CREATE POLICY "Hosts can insert own linen movements" ON linen_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    linen_item_id IN (
      SELECT id FROM linen_items WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can update own linen movements" ON linen_movements;
CREATE POLICY "Hosts can update own linen movements" ON linen_movements
  FOR UPDATE TO authenticated
  USING (
    linen_item_id IN (
      SELECT id FROM linen_items WHERE host_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    linen_item_id IN (
      SELECT id FROM linen_items WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can delete own linen movements" ON linen_movements;
CREATE POLICY "Hosts can delete own linen movements" ON linen_movements
  FOR DELETE TO authenticated
  USING (
    linen_item_id IN (
      SELECT id FROM linen_items WHERE host_id = (SELECT auth.uid())
    )
  );
