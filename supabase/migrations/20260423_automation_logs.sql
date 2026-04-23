CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending', 'skipped')),
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_reservation
  ON notification_logs(reservation_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status
  ON notification_logs(status);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read logs" ON notification_logs;
CREATE POLICY "Authenticated users can read logs" ON notification_logs
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role can insert logs" ON notification_logs;
CREATE POLICY "Service role can insert logs" ON notification_logs
  FOR INSERT TO service_role WITH CHECK (true);
