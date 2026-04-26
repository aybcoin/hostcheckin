-- HostCheckIn — Phase 2 Lot F — Dynamic pricing engine
-- Adds pricing_rules + pricing_overrides tables with host-scoped RLS.

-- =========================================================================
-- ALTER properties
-- =========================================================================

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS base_nightly_rate numeric(10, 2),
  ADD COLUMN IF NOT EXISTS pricing_currency text DEFAULT 'EUR';

UPDATE properties
SET pricing_currency = 'EUR'
WHERE pricing_currency IS NULL;

-- =========================================================================
-- TABLES
-- =========================================================================

CREATE TABLE IF NOT EXISTS pricing_rules (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id               uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  property_id           uuid REFERENCES properties(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  rule_type             text NOT NULL
                          CHECK (
                            rule_type IN (
                              'weekday',
                              'weekend',
                              'date_range',
                              'occupancy_low',
                              'occupancy_high',
                              'last_minute',
                              'far_future',
                              'min_nights'
                            )
                          ),
  priority              integer NOT NULL DEFAULT 0,
  is_active             boolean NOT NULL DEFAULT true,
  multiplier            numeric(5, 3) NOT NULL CHECK (multiplier > 0),
  flat_adjustment       numeric(10, 2) NOT NULL DEFAULT 0,
  weekdays              integer[] NOT NULL DEFAULT '{}',
  start_date            date,
  end_date              date,
  min_nights_threshold  integer,
  lead_days_min         integer,
  lead_days_max         integer,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_host_id
  ON pricing_rules(host_id);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_property_id
  ON pricing_rules(property_id);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_rule_type
  ON pricing_rules(rule_type);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_is_active
  ON pricing_rules(is_active);

CREATE TABLE IF NOT EXISTS pricing_overrides (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id       uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  property_id   uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  target_date   date NOT NULL,
  nightly_rate  numeric(10, 2) NOT NULL CHECK (nightly_rate >= 0),
  reason        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(property_id, target_date)
);

CREATE INDEX IF NOT EXISTS idx_pricing_overrides_host_id
  ON pricing_overrides(host_id);

CREATE INDEX IF NOT EXISTS idx_pricing_overrides_property_id
  ON pricing_overrides(property_id);

CREATE INDEX IF NOT EXISTS idx_pricing_overrides_target_date
  ON pricing_overrides(target_date);

-- =========================================================================
-- updated_at triggers
-- =========================================================================

CREATE OR REPLACE FUNCTION set_pricing_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pricing_rules_updated_at ON pricing_rules;
CREATE TRIGGER trg_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION set_pricing_rules_updated_at();

CREATE OR REPLACE FUNCTION set_pricing_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pricing_overrides_updated_at ON pricing_overrides;
CREATE TRIGGER trg_pricing_overrides_updated_at
  BEFORE UPDATE ON pricing_overrides
  FOR EACH ROW EXECUTE FUNCTION set_pricing_overrides_updated_at();

-- =========================================================================
-- RLS — pricing_rules
-- =========================================================================

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own pricing rules" ON pricing_rules;
CREATE POLICY "Hosts can read own pricing rules" ON pricing_rules
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can insert own pricing rules" ON pricing_rules;
CREATE POLICY "Hosts can insert own pricing rules" ON pricing_rules
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can update own pricing rules" ON pricing_rules;
CREATE POLICY "Hosts can update own pricing rules" ON pricing_rules
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = host_id)
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can delete own pricing rules" ON pricing_rules;
CREATE POLICY "Hosts can delete own pricing rules" ON pricing_rules
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = host_id);

-- =========================================================================
-- RLS — pricing_overrides
-- =========================================================================

ALTER TABLE pricing_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own pricing overrides" ON pricing_overrides;
CREATE POLICY "Hosts can read own pricing overrides" ON pricing_overrides
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can insert own pricing overrides" ON pricing_overrides;
CREATE POLICY "Hosts can insert own pricing overrides" ON pricing_overrides
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can update own pricing overrides" ON pricing_overrides;
CREATE POLICY "Hosts can update own pricing overrides" ON pricing_overrides
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = host_id)
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can delete own pricing overrides" ON pricing_overrides;
CREATE POLICY "Hosts can delete own pricing overrides" ON pricing_overrides
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = host_id);
