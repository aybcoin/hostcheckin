/*
  # HostCheckIn - Complete Application Schema

  1. New Tables
    - `hosts` - Host user information
    - `properties` - Rental properties (max 3 per host)
    - `reservations` - Guest reservations
    - `guests` - Guest information
    - `identity_verification` - Guest identity documents
    - `contracts` - Digital contracts

  2. Security
    - Enable RLS on all tables
    - Add policies for hosts and guests to access their data
*/

CREATE TABLE IF NOT EXISTS hosts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  profile_image_url text,
  company_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  postal_code text,
  country text NOT NULL,
  description text,
  rooms_count integer NOT NULL DEFAULT 1,
  bathrooms_count integer NOT NULL DEFAULT 1,
  max_guests integer NOT NULL DEFAULT 1,
  amenities text[] DEFAULT '{}',
  check_in_time text DEFAULT '15:00',
  check_out_time text DEFAULT '11:00',
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  country text,
  date_of_birth date,
  profile_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  number_of_guests integer NOT NULL,
  booking_reference text UNIQUE NOT NULL,
  unique_link text UNIQUE NOT NULL,
  status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS identity_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  id_type text NOT NULL,
  id_document_url text NOT NULL,
  selfie_url text,
  status text DEFAULT 'pending',
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  contract_type text NOT NULL,
  pdf_url text NOT NULL,
  signed_by_guest boolean DEFAULT false,
  signed_by_host boolean DEFAULT false,
  guest_signature_url text,
  host_signature_url text,
  signed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view and edit own profile"
  ON hosts FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Hosts can view and edit own properties"
  ON properties FOR ALL
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Guests can view own reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (guest_id IN (
    SELECT id FROM guests WHERE email = auth.jwt()->>'email'
  ));

CREATE POLICY "Hosts can view reservations for own properties"
  ON reservations FOR SELECT
  TO authenticated
  USING (property_id IN (
    SELECT id FROM properties WHERE host_id = auth.uid()
  ));

CREATE POLICY "Hosts can insert reservations for own properties"
  ON reservations FOR INSERT
  TO authenticated
  WITH CHECK (property_id IN (
    SELECT id FROM properties WHERE host_id = auth.uid()
  ));

CREATE POLICY "Hosts can update reservations for own properties"
  ON reservations FOR UPDATE
  TO authenticated
  USING (property_id IN (
    SELECT id FROM properties WHERE host_id = auth.uid()
  ))
  WITH CHECK (property_id IN (
    SELECT id FROM properties WHERE host_id = auth.uid()
  ));

CREATE POLICY "Anyone can view guests"
  ON guests FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert guests"
  ON guests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Hosts can view verification for own properties"
  ON identity_verification FOR SELECT
  TO authenticated
  USING (reservation_id IN (
    SELECT id FROM reservations WHERE property_id IN (
      SELECT id FROM properties WHERE host_id = auth.uid()
    )
  ));

CREATE POLICY "Hosts can verify identity for own properties"
  ON identity_verification FOR UPDATE
  TO authenticated
  USING (reservation_id IN (
    SELECT id FROM reservations WHERE property_id IN (
      SELECT id FROM properties WHERE host_id = auth.uid()
    )
  ))
  WITH CHECK (reservation_id IN (
    SELECT id FROM reservations WHERE property_id IN (
      SELECT id FROM properties WHERE host_id = auth.uid()
    )
  ));

CREATE POLICY "Hosts can view contracts for own properties"
  ON contracts FOR SELECT
  TO authenticated
  USING (property_id IN (
    SELECT id FROM properties WHERE host_id = auth.uid()
  ));

CREATE INDEX idx_properties_host_id ON properties(host_id);
CREATE INDEX idx_reservations_property_id ON reservations(property_id);
CREATE INDEX idx_reservations_guest_id ON reservations(guest_id);
CREATE INDEX idx_reservations_unique_link ON reservations(unique_link);
CREATE INDEX idx_identity_reservation_id ON identity_verification(reservation_id);
CREATE INDEX idx_contracts_reservation_id ON contracts(reservation_id);