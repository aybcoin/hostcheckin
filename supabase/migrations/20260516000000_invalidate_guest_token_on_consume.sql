-- Step 2.1: invalidate guest_tokens after the check-in is completed.
-- Previously `used_at` was set on the first portal read, which made it
-- impossible to use as a consumption marker. We:
--   1) Clear stale `used_at` for tokens whose reservation has NOT been
--      verified yet (so in-flight guests keep their access).
--   2) Tighten anon RLS to reject tokens that have been consumed.
--
-- This migration is a no-op on environments that do not yet have the
-- guest_tokens table (some installs disable the guest portal).

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'guest_tokens'
  ) THEN
    RAISE NOTICE 'guest_tokens table missing — skipping guest token invalidation migration';
    RETURN;
  END IF;

  EXECUTE $sql$
UPDATE guest_tokens gt
SET used_at = NULL
WHERE gt.used_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM reservations r
    WHERE r.id = gt.reservation_id
      AND r.status = 'verified'
  );

DROP POLICY IF EXISTS "Public can read valid tokens" ON guest_tokens;
CREATE POLICY "Public can read valid tokens" ON guest_tokens
  FOR SELECT TO anon
  USING (expires_at > NOW() AND used_at IS NULL);

DROP POLICY IF EXISTS "Public can mark valid tokens as used" ON guest_tokens;
CREATE POLICY "Public can consume valid tokens" ON guest_tokens
  FOR UPDATE TO anon
  USING (expires_at > NOW() AND used_at IS NULL)
  WITH CHECK (expires_at > NOW());

DROP POLICY IF EXISTS "Anon can update reservations with active guest token" ON reservations;
CREATE POLICY "Anon can update reservations with active guest token"
  ON reservations FOR UPDATE TO anon
  USING (
    id IN (
      SELECT gt.reservation_id
      FROM guest_tokens gt
      WHERE gt.expires_at > NOW() AND gt.used_at IS NULL
    )
  )
  WITH CHECK (
    id IN (
      SELECT gt.reservation_id
      FROM guest_tokens gt
      WHERE gt.expires_at > NOW() AND gt.used_at IS NULL
    )
  );
$sql$;
END $migration$;
