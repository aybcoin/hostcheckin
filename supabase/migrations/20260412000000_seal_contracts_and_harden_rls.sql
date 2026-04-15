/*
  # Seal contracts + harden RLS

  1. New columns on contracts:
     - locked (boolean) — once true, PDF cannot be regenerated
     - sealed_at (timestamptz) — when the PDF was sealed
     - pdf_bytes_hash (text) — SHA-256 of the raw PDF bytes for integrity check

  2. RLS hardening:
     - Remove dangerous "Anon can update identity verification" policy
       (updates now happen from verify-identity edge fn using service_role)
     - Remove "Anyone can insert audit log entries" policy
       (inserts now happen from edge fns using service_role)
     - Scope contract-pdfs storage SELECT to host's own properties
*/

-- 1. Add seal columns to contracts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'locked'
  ) THEN
    ALTER TABLE contracts ADD COLUMN locked boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'sealed_at'
  ) THEN
    ALTER TABLE contracts ADD COLUMN sealed_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'pdf_bytes_hash'
  ) THEN
    ALTER TABLE contracts ADD COLUMN pdf_bytes_hash text;
  END IF;
END $$;

-- 2. Drop the dangerous anon UPDATE policy on identity_verification.
-- The verify-identity edge function uses service_role key, which bypasses RLS,
-- so removing this policy changes nothing for the intended flow — it only
-- blocks anon users from promoting their own verification to 'approved'.
DROP POLICY IF EXISTS "Anon can update identity verification" ON identity_verification;

-- 3. Drop the open INSERT policy on signature_audit_log.
-- All inserts now go through edge functions (log-audit-event, verify-identity,
-- generate-contract-pdf, download-contract-pdf) using service_role key.
DROP POLICY IF EXISTS "Anyone can insert audit log entries" ON signature_audit_log;

-- 4. Tighten contract-pdfs storage SELECT — only host can see their own PDFs.
-- Drop the overly-permissive policy first.
DROP POLICY IF EXISTS "Hosts can view contract PDFs" ON storage.objects;

CREATE POLICY "Hosts can view own contract PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contract-pdfs'
    AND (storage.foldername(name))[1] IN (
      SELECT r.id::text FROM reservations r
      JOIN properties p ON r.property_id = p.id
      WHERE p.host_id = (SELECT auth.uid())
    )
  );
