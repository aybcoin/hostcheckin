/*
  # Create files management system

  1. New Tables
    - `files`
      - `id` (uuid, primary key) - Unique identifier for each file
      - `name` (text) - Original filename
      - `size` (bigint) - File size in bytes
      - `mime_type` (text) - MIME type of the file
      - `storage_path` (text) - Path in Supabase storage
      - `uploaded_by` (uuid) - User who uploaded the file
      - `created_at` (timestamptz) - Upload timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `files` table
    - Add policy for authenticated users to view their own files
    - Add policy for authenticated users to insert their own files
    - Add policy for authenticated users to delete their own files
*/

CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size bigint NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own files"
  ON files FOR SELECT
  TO authenticated
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Users can insert own files"
  ON files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete own files"
  ON files FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);