/*
  # Create public storage bucket for guest check-in files

  1. New Storage Bucket
    - `checkin-files` - Public bucket for storing guest verification photos
    - Files stored under reservation_id/ folders

  2. Security
    - Anonymous users can upload files during guest check-in flow
    - Authenticated users (hosts) can view all files in their reservation folders
    - Anonymous users can read files they uploaded (for confirmation display)

  3. Notes
    - Bucket is public so hosts can view files via direct URL
    - Upload path structure: checkin-files/{reservation_id}/{file_type}_{timestamp}.{ext}
    - Hosts access files through identity_verification and contracts table URLs
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('checkin-files', 'checkin-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload checkin files"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'checkin-files');

CREATE POLICY "Anyone can view checkin files"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'checkin-files');

CREATE POLICY "Authenticated users can delete checkin files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'checkin-files');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'identity_verification' AND column_name = 'id_back_url'
  ) THEN
    ALTER TABLE identity_verification ADD COLUMN id_back_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'contract_content'
  ) THEN
    ALTER TABLE contracts ADD COLUMN contract_content text;
  END IF;
END $$;

CREATE POLICY "Hosts can view identity verification for own reservations"
  ON identity_verification FOR SELECT
  TO authenticated
  USING (
    reservation_id IN (
      SELECT r.id FROM reservations r
      JOIN properties p ON r.property_id = p.id
      WHERE p.host_id = auth.uid()
    )
  );
