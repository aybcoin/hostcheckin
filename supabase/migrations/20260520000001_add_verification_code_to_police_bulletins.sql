-- Add verification_code column to police_bulletins
-- This stores the HC-FP-YYYYMMDD-APPT-ORDRE-HASH8 cryptographic verification code
-- generated when the police bulletin PDF is first created.
ALTER TABLE police_bulletins
  ADD COLUMN IF NOT EXISTS verification_code text;

-- Index for fast lookup by verification code (e.g. for document authenticity checks)
CREATE INDEX IF NOT EXISTS idx_police_bulletins_verification_code
  ON police_bulletins (verification_code)
  WHERE verification_code IS NOT NULL;
