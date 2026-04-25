-- HostCheckIn — Phase 1 Housekeeping module
-- Adds housekeeping_tasks + housekeeping_checklist_items, RLS, and auto-task trigger.

-- =========================================================================
-- TABLES
-- =========================================================================

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id         uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  reservation_id  uuid REFERENCES reservations(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'validated', 'issue_reported')),
  priority        text NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('normal', 'high', 'critical')),
  scheduled_for   date NOT NULL,
  due_before      timestamptz,
  assigned_to     text,
  notes           text,
  issue_note      text,
  photos_urls     text[] DEFAULT '{}',
  started_at      timestamptz,
  completed_at    timestamptz,
  validated_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_host_id        ON housekeeping_tasks(host_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_property_id    ON housekeeping_tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_reservation_id ON housekeeping_tasks(reservation_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_status         ON housekeeping_tasks(status);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_scheduled_for  ON housekeeping_tasks(scheduled_for);

CREATE TABLE IF NOT EXISTS housekeeping_checklist_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES housekeeping_tasks(id) ON DELETE CASCADE,
  -- stable code key resolved by frontend i18n (e.g. 'aerate', 'change_sheets').
  label_key   text NOT NULL,
  custom_label text,
  is_done     boolean NOT NULL DEFAULT false,
  position    integer NOT NULL DEFAULT 0,
  done_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_housekeeping_checklist_task_id ON housekeeping_checklist_items(task_id);

-- =========================================================================
-- updated_at trigger
-- =========================================================================

CREATE OR REPLACE FUNCTION set_housekeeping_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_housekeeping_tasks_updated_at ON housekeeping_tasks;
CREATE TRIGGER trg_housekeeping_tasks_updated_at
  BEFORE UPDATE ON housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION set_housekeeping_tasks_updated_at();

-- =========================================================================
-- Default checklist seeding on task INSERT
-- =========================================================================

CREATE OR REPLACE FUNCTION seed_default_housekeeping_checklist()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM housekeeping_checklist_items WHERE task_id = NEW.id) THEN
    INSERT INTO housekeeping_checklist_items (task_id, label_key, position) VALUES
      (NEW.id, 'aerate',              1),
      (NEW.id, 'remove_trash',        2),
      (NEW.id, 'change_sheets',       3),
      (NEW.id, 'change_towels',       4),
      (NEW.id, 'clean_kitchen',       5),
      (NEW.id, 'clean_bathroom',      6),
      (NEW.id, 'clean_floors',        7),
      (NEW.id, 'check_fridge',        8),
      (NEW.id, 'check_consumables',   9),
      (NEW.id, 'check_damages',       10),
      (NEW.id, 'check_remotes_keys',  11),
      (NEW.id, 'final_photos',        12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_seed_default_housekeeping_checklist ON housekeeping_tasks;
CREATE TRIGGER trg_seed_default_housekeeping_checklist
  AFTER INSERT ON housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION seed_default_housekeeping_checklist();

-- =========================================================================
-- Auto-create housekeeping task when a reservation is added
-- (One pending task per reservation; safe re-entry via existence check.)
-- =========================================================================

CREATE OR REPLACE FUNCTION create_housekeeping_for_reservation()
RETURNS TRIGGER AS $$
DECLARE
  v_host_id     uuid;
  v_priority    text := 'normal';
  v_already_has integer;
BEGIN
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  SELECT host_id INTO v_host_id FROM properties WHERE id = NEW.property_id;
  IF v_host_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_already_has
    FROM housekeeping_tasks
    WHERE reservation_id = NEW.id;
  IF v_already_has > 0 THEN
    RETURN NEW;
  END IF;

  -- Same-day turnover bumps priority to critical: another reservation begins on the checkout date.
  IF EXISTS (
    SELECT 1 FROM reservations r2
    WHERE r2.property_id = NEW.property_id
      AND r2.id <> NEW.id
      AND r2.status <> 'cancelled'
      AND r2.check_in_date = NEW.check_out_date
  ) THEN
    v_priority := 'critical';
  END IF;

  INSERT INTO housekeeping_tasks (
    host_id, property_id, reservation_id, status, priority, scheduled_for, due_before
  ) VALUES (
    v_host_id,
    NEW.property_id,
    NEW.id,
    'pending',
    v_priority,
    NEW.check_out_date,
    (NEW.check_out_date::timestamptz + INTERVAL '6 hours')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_create_housekeeping_for_reservation ON reservations;
CREATE TRIGGER trg_create_housekeeping_for_reservation
  AFTER INSERT ON reservations
  FOR EACH ROW EXECUTE FUNCTION create_housekeeping_for_reservation();

-- =========================================================================
-- RLS — housekeeping_tasks
-- =========================================================================

ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own housekeeping tasks" ON housekeeping_tasks;
CREATE POLICY "Hosts can read own housekeeping tasks" ON housekeeping_tasks
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can insert own housekeeping tasks" ON housekeeping_tasks;
CREATE POLICY "Hosts can insert own housekeeping tasks" ON housekeeping_tasks
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can update own housekeeping tasks" ON housekeeping_tasks;
CREATE POLICY "Hosts can update own housekeeping tasks" ON housekeeping_tasks
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = host_id)
  WITH CHECK ((SELECT auth.uid()) = host_id);

DROP POLICY IF EXISTS "Hosts can delete own housekeeping tasks" ON housekeeping_tasks;
CREATE POLICY "Hosts can delete own housekeeping tasks" ON housekeeping_tasks
  FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = host_id);

-- =========================================================================
-- RLS — housekeeping_checklist_items
-- =========================================================================

ALTER TABLE housekeeping_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own checklist items" ON housekeeping_checklist_items;
CREATE POLICY "Hosts can read own checklist items" ON housekeeping_checklist_items
  FOR SELECT TO authenticated
  USING (
    task_id IN (
      SELECT id FROM housekeeping_tasks WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can insert own checklist items" ON housekeeping_checklist_items;
CREATE POLICY "Hosts can insert own checklist items" ON housekeeping_checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (
    task_id IN (
      SELECT id FROM housekeeping_tasks WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can update own checklist items" ON housekeeping_checklist_items;
CREATE POLICY "Hosts can update own checklist items" ON housekeeping_checklist_items
  FOR UPDATE TO authenticated
  USING (
    task_id IN (
      SELECT id FROM housekeeping_tasks WHERE host_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    task_id IN (
      SELECT id FROM housekeeping_tasks WHERE host_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Hosts can delete own checklist items" ON housekeeping_checklist_items;
CREATE POLICY "Hosts can delete own checklist items" ON housekeeping_checklist_items
  FOR DELETE TO authenticated
  USING (
    task_id IN (
      SELECT id FROM housekeeping_tasks WHERE host_id = (SELECT auth.uid())
    )
  );
