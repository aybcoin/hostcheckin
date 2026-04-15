/*
  # Create storage bucket for files

  1. New Storage Bucket
    - `user-files` - Bucket for storing user uploaded files

  2. Security
    - Enable RLS on storage bucket
    - Add policy for authenticated users to upload their own files
    - Add policy for authenticated users to view their own files
    - Add policy for authenticated users to delete their own files
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-files' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );