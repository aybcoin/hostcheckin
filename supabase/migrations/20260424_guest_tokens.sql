CREATE TABLE IF NOT EXISTS guest_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_tokens_token ON guest_tokens(token);
CREATE INDEX IF NOT EXISTS idx_guest_tokens_reservation ON guest_tokens(reservation_id);

ALTER TABLE guest_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read valid tokens" ON guest_tokens;
CREATE POLICY "Public can read valid tokens" ON guest_tokens
  FOR SELECT TO anon
  USING (expires_at > NOW());

DROP POLICY IF EXISTS "Hosts can read own reservation tokens" ON guest_tokens;
CREATE POLICY "Hosts can read own reservation tokens" ON guest_tokens
  FOR SELECT TO authenticated
  USING (
    reservation_id IN (
      SELECT r.id
      FROM reservations r
      JOIN properties p ON p.id = r.property_id
      WHERE p.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts can create own reservation tokens" ON guest_tokens;
CREATE POLICY "Hosts can create own reservation tokens" ON guest_tokens
  FOR INSERT TO authenticated
  WITH CHECK (
    reservation_id IN (
      SELECT r.id
      FROM reservations r
      JOIN properties p ON p.id = r.property_id
      WHERE p.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can mark valid tokens as used" ON guest_tokens;
CREATE POLICY "Public can mark valid tokens as used" ON guest_tokens
  FOR UPDATE TO anon
  USING (expires_at > NOW())
  WITH CHECK (expires_at > NOW());

DROP POLICY IF EXISTS "Hosts can update own reservation tokens" ON guest_tokens;
CREATE POLICY "Hosts can update own reservation tokens" ON guest_tokens
  FOR UPDATE TO authenticated
  USING (
    reservation_id IN (
      SELECT r.id
      FROM reservations r
      JOIN properties p ON p.id = r.property_id
      WHERE p.host_id = auth.uid()
    )
  )
  WITH CHECK (
    reservation_id IN (
      SELECT r.id
      FROM reservations r
      JOIN properties p ON p.id = r.property_id
      WHERE p.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anon can update reservations with active guest token" ON reservations;
CREATE POLICY "Anon can update reservations with active guest token"
  ON reservations FOR UPDATE TO anon
  USING (
    id IN (
      SELECT gt.reservation_id
      FROM guest_tokens gt
      WHERE gt.expires_at > NOW()
    )
  )
  WITH CHECK (
    id IN (
      SELECT gt.reservation_id
      FROM guest_tokens gt
      WHERE gt.expires_at > NOW()
    )
  );
