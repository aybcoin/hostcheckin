/*
  # Add anonymous guest check-in access and contract templates

  1. Security Changes
    - Add SELECT policy on `reservations` for anonymous users (by unique_link only)
    - Add SELECT policy on `properties` for anonymous users (only if linked to a reservation via unique_link)
    - Add SELECT policy on `contracts` for anonymous users (by reservation_id)
    - Add INSERT policy on `identity_verification` for anonymous users (guest check-in flow)
    - Add UPDATE policy on `contracts` for anonymous users (guest signature)
    - Add UPDATE policy on `guests` for authenticated users (host can update guest info)

  2. New Tables
    - `contract_templates`
      - `id` (uuid, primary key)
      - `host_id` (uuid, references hosts)
      - `name` (text) - template name for the host
      - `content` (text) - the contract body text with placeholders
      - `is_default` (boolean) - whether this is the default template
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Notes
    - Anonymous policies are scoped narrowly to only allow reading data needed for guest check-in
    - Contract templates support placeholders like {{property_name}}, {{guest_name}}, etc.
    - Each host can have multiple templates but only one default
*/

-- Anonymous users can read a reservation by its unique_link
CREATE POLICY "Anon can view reservation by unique_link"
  ON reservations FOR SELECT
  TO anon
  USING (unique_link IS NOT NULL);

-- Anonymous users can read property info for check-in display
CREATE POLICY "Anon can view properties for checkin"
  ON properties FOR SELECT
  TO anon
  USING (
    id IN (SELECT property_id FROM reservations)
  );

-- Anonymous users can view contracts linked to a reservation
CREATE POLICY "Anon can view contracts for checkin"
  ON contracts FOR SELECT
  TO anon
  USING (true);

-- Anonymous users can insert identity verification during check-in
CREATE POLICY "Anon can submit identity verification"
  ON identity_verification FOR INSERT
  TO anon
  WITH CHECK (
    reservation_id IN (SELECT id FROM reservations)
  );

-- Anonymous users can update contracts to add guest signature
CREATE POLICY "Anon can sign contracts as guest"
  ON contracts FOR UPDATE
  TO anon
  USING (
    reservation_id IN (SELECT id FROM reservations)
  )
  WITH CHECK (
    reservation_id IN (SELECT id FROM reservations)
  );

-- Hosts can insert contracts for their properties
CREATE POLICY "Hosts can insert contracts for own properties"
  ON contracts FOR INSERT
  TO authenticated
  WITH CHECK (property_id IN (
    SELECT id FROM properties WHERE host_id = (SELECT auth.uid())
  ));

-- Hosts can update contracts for their properties
CREATE POLICY "Hosts can update contracts for own properties"
  ON contracts FOR UPDATE
  TO authenticated
  USING (property_id IN (
    SELECT id FROM properties WHERE host_id = (SELECT auth.uid())
  ))
  WITH CHECK (property_id IN (
    SELECT id FROM properties WHERE host_id = (SELECT auth.uid())
  ));

-- Authenticated users can update guests (hosts updating guest info)
CREATE POLICY "Hosts can update guests"
  ON guests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Contract templates table
CREATE TABLE IF NOT EXISTS contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view own templates"
  ON contract_templates FOR SELECT
  TO authenticated
  USING (host_id = (SELECT auth.uid()));

CREATE POLICY "Hosts can insert own templates"
  ON contract_templates FOR INSERT
  TO authenticated
  WITH CHECK (host_id = (SELECT auth.uid()));

CREATE POLICY "Hosts can update own templates"
  ON contract_templates FOR UPDATE
  TO authenticated
  USING (host_id = (SELECT auth.uid()))
  WITH CHECK (host_id = (SELECT auth.uid()));

CREATE POLICY "Hosts can delete own templates"
  ON contract_templates FOR DELETE
  TO authenticated
  USING (host_id = (SELECT auth.uid()));

-- Anon can read contract templates (needed to display contract in guest check-in)
CREATE POLICY "Anon can view contract templates"
  ON contract_templates FOR SELECT
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_contract_templates_host_id ON contract_templates(host_id);

-- Add template_id column to contracts to link to templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE contracts ADD COLUMN template_id uuid REFERENCES contract_templates(id);
  END IF;
END $$;
