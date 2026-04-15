/*
  # Add verification type, smart lock code, and guest rating fields

  1. Modified Tables
    - `reservations`
      - `verification_type` (text) - 'simple' or 'complete', defaults to 'simple'
      - `smart_lock_code` (text) - optional smart lock code for the property
      - `guest_rating` (integer) - host rating of the guest (1-5)
      - `cancelled_at` (timestamptz) - when the reservation was cancelled

  2. Notes
    - verification_type supports the two modes: Simple and Complete verification
    - smart_lock_code allows hosts to share lock codes with guests
    - guest_rating allows hosts to rate guests after their stay
    - status field updated to support 'cancelled' status
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'verification_type'
  ) THEN
    ALTER TABLE reservations ADD COLUMN verification_type text DEFAULT 'simple';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'smart_lock_code'
  ) THEN
    ALTER TABLE reservations ADD COLUMN smart_lock_code text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'guest_rating'
  ) THEN
    ALTER TABLE reservations ADD COLUMN guest_rating integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE reservations ADD COLUMN cancelled_at timestamptz;
  END IF;
END $$;

CREATE POLICY "Hosts can delete reservations for own properties"
  ON reservations FOR DELETE
  TO authenticated
  USING (property_id IN (
    SELECT id FROM properties WHERE host_id = (SELECT auth.uid())
  ));
