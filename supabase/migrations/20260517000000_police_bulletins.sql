-- Police bulletin (Moroccan "Bulletin individuel") schema.
--
-- Captures the form a foreign guest must fill on arrival. Most fields are
-- pre-filled from existing reservation/guest/property data — the guest only
-- confirms or completes profession + travel origin/destination + address.
--
-- Designed to be additive: the feature is OFF by default per host
-- (hosts.police_bulletin_enabled) and the migration is safe to run on
-- environments that don't yet have guest_tokens.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS appart_no text;

ALTER TABLE hosts
  ADD COLUMN IF NOT EXISTS police_bulletin_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE hosts
  ADD COLUMN IF NOT EXISTS police_bulletin_counter integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS police_bulletins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL UNIQUE REFERENCES reservations(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  appart_no text,
  ordre_no integer,
  full_name text,
  first_name text,
  date_of_birth date,
  place_of_birth text,
  nationality text,
  profession text,
  coming_from text,
  going_to text,
  arrival_date date,
  home_address text,
  passport_no text,
  signature_url text,
  pdf_storage_path text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_police_bulletins_host_created
  ON police_bulletins (host_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_police_bulletins_reservation
  ON police_bulletins (reservation_id);

ALTER TABLE police_bulletins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can read own police_bulletins" ON police_bulletins;
CREATE POLICY "Hosts can read own police_bulletins" ON police_bulletins
  FOR SELECT TO authenticated
  USING (host_id = auth.uid());

DROP POLICY IF EXISTS "Hosts can insert own police_bulletins" ON police_bulletins;
CREATE POLICY "Hosts can insert own police_bulletins" ON police_bulletins
  FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

DROP POLICY IF EXISTS "Hosts can update own police_bulletins" ON police_bulletins;
CREATE POLICY "Hosts can update own police_bulletins" ON police_bulletins
  FOR UPDATE TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Anon submission path: only attach if guest_tokens exists (some installs
-- haven't enabled the guest portal yet).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'guest_tokens'
  ) THEN
    DROP POLICY IF EXISTS "Anon can submit police_bulletin via guest_token" ON police_bulletins;
    EXECUTE $POL$
      CREATE POLICY "Anon can submit police_bulletin via guest_token" ON police_bulletins
        FOR INSERT TO anon
        WITH CHECK (
          reservation_id IN (
            SELECT gt.reservation_id FROM guest_tokens gt
            WHERE gt.expires_at > NOW() AND gt.used_at IS NULL
          )
        )
    $POL$;

    DROP POLICY IF EXISTS "Anon can update own police_bulletin via guest_token" ON police_bulletins;
    EXECUTE $POL$
      CREATE POLICY "Anon can update own police_bulletin via guest_token" ON police_bulletins
        FOR UPDATE TO anon
        USING (
          reservation_id IN (
            SELECT gt.reservation_id FROM guest_tokens gt
            WHERE gt.expires_at > NOW() AND gt.used_at IS NULL
          )
        )
        WITH CHECK (
          reservation_id IN (
            SELECT gt.reservation_id FROM guest_tokens gt
            WHERE gt.expires_at > NOW() AND gt.used_at IS NULL
          )
        )
    $POL$;
  END IF;
END $$;
