/*
  # Add auto-link booking, blacklist and verification mode configuration

  1. Columns:
    - properties.verification_mode
    - reservations.verification_mode

  2. New tables:
    - property_auto_links
    - blacklisted_guests
    - public_booking_attempts (rate limiting)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'verification_mode'
  ) THEN
    ALTER TABLE properties ADD COLUMN verification_mode text DEFAULT 'simple';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'verification_mode'
  ) THEN
    ALTER TABLE reservations ADD COLUMN verification_mode text DEFAULT 'simple';
  END IF;
END $$;

UPDATE properties
SET verification_mode = 'simple'
WHERE verification_mode IS NULL;

UPDATE reservations
SET verification_mode = COALESCE(verification_type, 'simple')
WHERE verification_mode IS NULL;

CREATE TABLE IF NOT EXISTS property_auto_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE UNIQUE,
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  property_token text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_auto_links_host_id
  ON property_auto_links(host_id);

CREATE INDEX IF NOT EXISTS idx_property_auto_links_token
  ON property_auto_links(property_token);

CREATE TABLE IF NOT EXISTS blacklisted_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  document_number text,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blacklisted_guests_host_id
  ON blacklisted_guests(host_id);

CREATE INDEX IF NOT EXISTS idx_blacklisted_guests_email
  ON blacklisted_guests(email);

CREATE INDEX IF NOT EXISTS idx_blacklisted_guests_phone
  ON blacklisted_guests(phone);

CREATE TABLE IF NOT EXISTS public_booking_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  property_token text NOT NULL,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_booking_attempts_ip_created_at
  ON public_booking_attempts(ip_address, created_at DESC);

ALTER TABLE property_auto_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_booking_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hosts can view own auto links" ON property_auto_links;
DROP POLICY IF EXISTS "Hosts can insert own auto links" ON property_auto_links;
DROP POLICY IF EXISTS "Hosts can update own auto links" ON property_auto_links;
DROP POLICY IF EXISTS "Hosts can delete own auto links" ON property_auto_links;

CREATE POLICY "Hosts can view own auto links"
  ON property_auto_links FOR SELECT
  TO authenticated
  USING (host_id = (SELECT auth.uid()));

CREATE POLICY "Hosts can insert own auto links"
  ON property_auto_links FOR INSERT
  TO authenticated
  WITH CHECK (host_id = (SELECT auth.uid()));

CREATE POLICY "Hosts can update own auto links"
  ON property_auto_links FOR UPDATE
  TO authenticated
  USING (host_id = (SELECT auth.uid()))
  WITH CHECK (host_id = (SELECT auth.uid()));

CREATE POLICY "Hosts can delete own auto links"
  ON property_auto_links FOR DELETE
  TO authenticated
  USING (host_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Hosts can view own blacklist" ON blacklisted_guests;
DROP POLICY IF EXISTS "Hosts can insert own blacklist" ON blacklisted_guests;
DROP POLICY IF EXISTS "Hosts can update own blacklist" ON blacklisted_guests;
DROP POLICY IF EXISTS "Hosts can delete own blacklist" ON blacklisted_guests;

CREATE POLICY "Hosts can view own blacklist"
  ON blacklisted_guests FOR SELECT
  TO authenticated
  USING (host_id = (SELECT auth.uid()));

CREATE POLICY "Hosts can insert own blacklist"
  ON blacklisted_guests FOR INSERT
  TO authenticated
  WITH CHECK (host_id = (SELECT auth.uid()));

CREATE POLICY "Hosts can update own blacklist"
  ON blacklisted_guests FOR UPDATE
  TO authenticated
  USING (host_id = (SELECT auth.uid()))
  WITH CHECK (host_id = (SELECT auth.uid()));

CREATE POLICY "Hosts can delete own blacklist"
  ON blacklisted_guests FOR DELETE
  TO authenticated
  USING (host_id = (SELECT auth.uid()));

-- No direct client access to rate-limiting table.
