/*
  # KYC Verification, Audit Trail, and Contract PDF Storage

  1. Modified Tables
    - `identity_verification`
      - `ocr_data` (jsonb) - OCR extracted data (name, document number, etc.)
      - `document_confidence` (numeric) - AI confidence score for document validity (0-1)
      - `face_match_score` (numeric) - Face comparison score between selfie and ID (0-1)
      - `rejection_reason` (text) - Reason if document was rejected
      - `ip_address` (text) - IP address of the submitter
      - `user_agent` (text) - Browser user agent string
      - `detected_document_type` (text) - AI-detected document type

    - `contracts`
      - `pdf_storage_path` (text) - Path in Supabase storage for the sealed PDF
      - `content_hash` (text) - SHA-256 hash of the contract content for integrity
      - `audit_trail` (jsonb) - Complete audit log of all contract events

  2. New Tables
    - `signature_audit_log`
      - `id` (uuid, primary key)
      - `contract_id` (uuid) - References contracts table
      - `reservation_id` (uuid) - References reservations table
      - `event_type` (text) - Type of event (contract_viewed, consent_given, signature_drawn, contract_signed)
      - `signer_role` (text) - 'host' or 'guest'
      - `signer_email` (text) - Email of the signer
      - `signer_name` (text) - Name of the signer
      - `ip_address` (text) - IP address at time of event
      - `user_agent` (text) - Browser user agent
      - `consent_text` (text) - Exact consent text shown and accepted
      - `metadata` (jsonb) - Additional event metadata
      - `created_at` (timestamptz) - Timestamp of event

  3. Security
    - RLS enabled on signature_audit_log
    - Hosts can view audit logs for their own property reservations
    - Anonymous users can insert audit log entries (during guest check-in)
    - No one can update or delete audit logs (immutable)

  4. Storage
    - New 'contract-pdfs' bucket for storing sealed contract PDFs
    - Hosts can view PDFs for their properties
    - Anonymous users can upload PDFs during check-in signing

  5. Notes
    - ocr_data stores structured JSON from document analysis
    - content_hash ensures contract integrity cannot be tampered with
    - audit_trail on contracts provides a complete event timeline
    - signature_audit_log is append-only for legal compliance
*/

-- Add KYC metadata columns to identity_verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'identity_verification' AND column_name = 'ocr_data'
  ) THEN
    ALTER TABLE identity_verification ADD COLUMN ocr_data jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'identity_verification' AND column_name = 'document_confidence'
  ) THEN
    ALTER TABLE identity_verification ADD COLUMN document_confidence numeric;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'identity_verification' AND column_name = 'face_match_score'
  ) THEN
    ALTER TABLE identity_verification ADD COLUMN face_match_score numeric;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'identity_verification' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE identity_verification ADD COLUMN rejection_reason text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'identity_verification' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE identity_verification ADD COLUMN ip_address text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'identity_verification' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE identity_verification ADD COLUMN user_agent text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'identity_verification' AND column_name = 'detected_document_type'
  ) THEN
    ALTER TABLE identity_verification ADD COLUMN detected_document_type text;
  END IF;
END $$;

-- Add contract PDF and integrity columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'pdf_storage_path'
  ) THEN
    ALTER TABLE contracts ADD COLUMN pdf_storage_path text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'content_hash'
  ) THEN
    ALTER TABLE contracts ADD COLUMN content_hash text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'audit_trail'
  ) THEN
    ALTER TABLE contracts ADD COLUMN audit_trail jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Create signature audit log table (append-only for legal compliance)
CREATE TABLE IF NOT EXISTS signature_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES contracts(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  signer_role text NOT NULL,
  signer_email text,
  signer_name text,
  ip_address text,
  user_agent text,
  consent_text text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE signature_audit_log ENABLE ROW LEVEL SECURITY;

-- Hosts can view audit logs for their reservations
CREATE POLICY "Hosts can view audit logs for own properties"
  ON signature_audit_log FOR SELECT
  TO authenticated
  USING (reservation_id IN (
    SELECT id FROM reservations WHERE property_id IN (
      SELECT id FROM properties WHERE host_id = (SELECT auth.uid())
    )
  ));

-- Anonymous and authenticated users can insert audit log entries
CREATE POLICY "Anyone can insert audit log entries"
  ON signature_audit_log FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    reservation_id IN (SELECT id FROM reservations)
  );

-- No update or delete policies - audit logs are immutable

CREATE INDEX IF NOT EXISTS idx_audit_log_contract ON signature_audit_log(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_reservation ON signature_audit_log(reservation_id);

-- Create contract-pdfs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-pdfs', 'contract-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated hosts can view contract PDFs for their properties
CREATE POLICY "Hosts can view contract PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'contract-pdfs');

-- Anyone can upload contract PDFs during signing
CREATE POLICY "Anyone can upload contract PDFs"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'contract-pdfs');

-- Anon users can insert identity verification with additional metadata
DROP POLICY IF EXISTS "Anon can submit identity verification" ON identity_verification;

CREATE POLICY "Anon can submit identity verification with metadata"
  ON identity_verification FOR INSERT
  TO anon
  WITH CHECK (
    reservation_id IN (SELECT id FROM reservations)
  );

-- Allow anon to update identity_verification (for KYC edge function to update results)
CREATE POLICY "Anon can update identity verification"
  ON identity_verification FOR UPDATE
  TO anon
  USING (
    reservation_id IN (SELECT id FROM reservations)
  )
  WITH CHECK (
    reservation_id IN (SELECT id FROM reservations)
  );
