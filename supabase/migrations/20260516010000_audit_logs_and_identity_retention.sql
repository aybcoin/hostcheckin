-- Phase 2.2 + 2.3: generic audit log + identity retention preference.
--
-- 1) Adds hosts.identity_retention_months (default 12, configurable).
-- 2) Creates audit_logs: append-only, host-scoped, used for sensitive
--    actions (identity viewed, reservation deleted, contract edited,
--    link shared, consent given, ...).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hosts' AND column_name = 'identity_retention_months'
  ) THEN
    ALTER TABLE hosts ADD COLUMN identity_retention_months integer NOT NULL DEFAULT 12;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  actor_user_id uuid,
  actor_role text NOT NULL CHECK (actor_role IN ('host', 'guest', 'anon', 'system')),
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_host_created
  ON audit_logs (host_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs (host_id, action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own audit logs" ON audit_logs;
CREATE POLICY "Hosts can read own audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (host_id = auth.uid());

DROP POLICY IF EXISTS "Hosts can append own audit logs" ON audit_logs;
CREATE POLICY "Hosts can append own audit logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "Anon can append guest audit logs" ON audit_logs;
CREATE POLICY "Anon can append guest audit logs" ON audit_logs
  FOR INSERT TO anon
  WITH CHECK (
    actor_role = 'guest'
    AND host_id IN (
      SELECT p.host_id
      FROM properties p
      JOIN reservations r ON r.property_id = p.id
      JOIN guest_tokens gt ON gt.reservation_id = r.id
      WHERE gt.expires_at > NOW()
    )
  );
