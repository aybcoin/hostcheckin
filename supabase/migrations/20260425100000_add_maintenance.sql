-- HostCheckIn — Phase 2 Lot A — Maintenance module
-- Adds maintenance_tickets + maintenance_comments, RLS policies.
-- Tickets are created manually only (no auto-creation trigger).

-- =========================================================================
-- TABLES
-- =========================================================================

CREATE TABLE IF NOT EXISTS maintenance_tickets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id         uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  reservation_id  uuid REFERENCES reservations(id) ON DELETE SET NULL,

  title           text NOT NULL,
  description     text,
  category        text NOT NULL
                    CHECK (category IN ('plumbing', 'electrical', 'appliance', 'hvac', 'structural', 'furniture', 'other')),
  priority        text NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'in_progress', 'waiting_parts', 'resolved', 'closed')),

  assigned_to     text,
  cost_estimate   numeric(10, 2),
  cost_actual     numeric(10, 2),

  reported_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  closed_at       timestamptz,

  photos_urls     text[] DEFAULT '{}',
  notes           text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_host_id        ON maintenance_tickets(host_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_property_id    ON maintenance_tickets(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_reservation_id ON maintenance_tickets(reservation_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_status         ON maintenance_tickets(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_priority       ON maintenance_tickets(priority);

CREATE TABLE IF NOT EXISTS maintenance_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES maintenance_tickets(id) ON DELETE CASCADE,
  author      text,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_comments_ticket_id ON maintenance_comments(ticket_id);

-- =========================================================================
-- updated_at trigger
-- =========================================================================

CREATE OR REPLACE FUNCTION set_maintenance_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_maintenance_tickets_updated_at ON maintenance_tickets;
CREATE TRIGGER trg_maintenance_tickets_updated_at
  BEFORE UPDATE ON maintenance_tickets
  FOR EACH ROW EXECUTE FUNCTION set_maintenance_tickets_updated_at();

-- =========================================================================
-- RLS — maintenance_tickets
-- =========================================================================

ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own maintenance tickets" ON maintenance_tickets;
CREATE POLICY "Hosts can read own maintenance tickets" ON maintenance_tickets
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can insert own maintenance tickets" ON maintenance_tickets;
CREATE POLICY "Hosts can insert own maintenance tickets" ON maintenance_tickets
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can update own maintenance tickets" ON maintenance_tickets;
CREATE POLICY "Hosts can update own maintenance tickets" ON maintenance_tickets
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = host_id)
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can delete own maintenance tickets" ON maintenance_tickets;
CREATE POLICY "Hosts can delete own maintenance tickets" ON maintenance_tickets
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = host_id);

-- =========================================================================
-- RLS — maintenance_comments
-- =========================================================================

ALTER TABLE maintenance_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own maintenance comments" ON maintenance_comments;
CREATE POLICY "Hosts can read own maintenance comments" ON maintenance_comments
  FOR SELECT TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM maintenance_tickets WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can insert own maintenance comments" ON maintenance_comments;
CREATE POLICY "Hosts can insert own maintenance comments" ON maintenance_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM maintenance_tickets WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can update own maintenance comments" ON maintenance_comments;
CREATE POLICY "Hosts can update own maintenance comments" ON maintenance_comments
  FOR UPDATE TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM maintenance_tickets WHERE host_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM maintenance_tickets WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can delete own maintenance comments" ON maintenance_comments;
CREATE POLICY "Hosts can delete own maintenance comments" ON maintenance_comments
  FOR DELETE TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM maintenance_tickets WHERE host_id = (SELECT auth.uid())
    )
  );
