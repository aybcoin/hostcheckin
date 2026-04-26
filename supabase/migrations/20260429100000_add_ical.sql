-- HostCheckIn — Phase 2 Lot E — iCal sync module
-- Adds iCal feeds, sync logs, and reservation external source metadata.

-- =========================================================================
-- TABLES
-- =========================================================================

CREATE TABLE IF NOT EXISTS ical_feeds (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id                  uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  property_id              uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  platform                 text NOT NULL
                             CHECK (platform IN ('airbnb', 'booking', 'vrbo', 'other')),
  ical_url                 text NOT NULL,
  display_name             text,
  is_active                boolean NOT NULL DEFAULT true,
  last_sync_at             timestamptz,
  last_sync_status         text
                             CHECK (
                               last_sync_status IN ('success', 'partial', 'failed')
                               OR last_sync_status IS NULL
                             ),
  last_sync_error          text,
  last_sync_imported_count integer NOT NULL DEFAULT 0,
  last_sync_skipped_count  integer NOT NULL DEFAULT 0,
  sync_interval_minutes    integer NOT NULL DEFAULT 60 CHECK (sync_interval_minutes >= 15),
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ical_feeds_property_platform_unique UNIQUE (property_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_ical_feeds_host_id
  ON ical_feeds(host_id);

CREATE INDEX IF NOT EXISTS idx_ical_feeds_property_id
  ON ical_feeds(property_id);

CREATE INDEX IF NOT EXISTS idx_ical_feeds_platform
  ON ical_feeds(platform);

CREATE TABLE IF NOT EXISTS ical_sync_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_id        uuid NOT NULL REFERENCES ical_feeds(id) ON DELETE CASCADE,
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  status         text NOT NULL
                   CHECK (status IN ('running', 'success', 'partial', 'failed')),
  imported_count integer NOT NULL DEFAULT 0,
  skipped_count  integer NOT NULL DEFAULT 0,
  error_message  text,
  events_summary jsonb
);

CREATE INDEX IF NOT EXISTS idx_ical_sync_logs_feed_started_at_desc
  ON ical_sync_logs(feed_id, started_at DESC);

-- =========================================================================
-- updated_at trigger
-- =========================================================================

CREATE OR REPLACE FUNCTION set_ical_feeds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ical_feeds_updated_at ON ical_feeds;
CREATE TRIGGER trg_ical_feeds_updated_at
  BEFORE UPDATE ON ical_feeds
  FOR EACH ROW EXECUTE FUNCTION set_ical_feeds_updated_at();

-- =========================================================================
-- RLS — ical_feeds
-- =========================================================================

ALTER TABLE ical_feeds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own iCal feeds" ON ical_feeds;
CREATE POLICY "Hosts can read own iCal feeds" ON ical_feeds
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can insert own iCal feeds" ON ical_feeds;
CREATE POLICY "Hosts can insert own iCal feeds" ON ical_feeds
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can update own iCal feeds" ON ical_feeds;
CREATE POLICY "Hosts can update own iCal feeds" ON ical_feeds
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = host_id)
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can delete own iCal feeds" ON ical_feeds;
CREATE POLICY "Hosts can delete own iCal feeds" ON ical_feeds
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = host_id);

-- =========================================================================
-- RLS — ical_sync_logs
-- =========================================================================

ALTER TABLE ical_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own iCal sync logs" ON ical_sync_logs;
CREATE POLICY "Hosts can read own iCal sync logs" ON ical_sync_logs
  FOR SELECT TO authenticated
  USING (
    feed_id IN (
      SELECT id FROM ical_feeds WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can insert own iCal sync logs" ON ical_sync_logs;
CREATE POLICY "Hosts can insert own iCal sync logs" ON ical_sync_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    feed_id IN (
      SELECT id FROM ical_feeds WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can update own iCal sync logs" ON ical_sync_logs;
CREATE POLICY "Hosts can update own iCal sync logs" ON ical_sync_logs
  FOR UPDATE TO authenticated
  USING (
    feed_id IN (
      SELECT id FROM ical_feeds WHERE host_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    feed_id IN (
      SELECT id FROM ical_feeds WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can delete own iCal sync logs" ON ical_sync_logs;
CREATE POLICY "Hosts can delete own iCal sync logs" ON ical_sync_logs
  FOR DELETE TO authenticated
  USING (
    feed_id IN (
      SELECT id FROM ical_feeds WHERE host_id = (SELECT auth.uid())
    )
  );

-- =========================================================================
-- ALTER reservations: external sync metadata
-- =========================================================================

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS external_source text
    CHECK (
      external_source IN ('manual', 'airbnb', 'booking', 'vrbo', 'other')
      OR external_source IS NULL
    ),
  ADD COLUMN IF NOT EXISTS external_uid text,
  ADD COLUMN IF NOT EXISTS external_feed_id uuid REFERENCES ical_feeds(id) ON DELETE SET NULL;

UPDATE reservations
SET external_source = 'manual'
WHERE external_source IS NULL;

ALTER TABLE reservations
  ALTER COLUMN external_source SET DEFAULT 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_external_feed_uid_unique
  ON reservations(external_feed_id, external_uid)
  WHERE external_uid IS NOT NULL;
