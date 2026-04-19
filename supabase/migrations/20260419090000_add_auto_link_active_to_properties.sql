/*
  # Add link activation metadata on properties

  This migration adds host-facing controls for:
  - global activation flag of the public booking link
  - regeneration timestamp for audit/support
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'auto_link_active'
  ) THEN
    ALTER TABLE properties
      ADD COLUMN auto_link_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'auto_link_regenerated_at'
  ) THEN
    ALTER TABLE properties
      ADD COLUMN auto_link_regenerated_at timestamptz;
  END IF;
END $$;

UPDATE properties p
SET auto_link_active = COALESCE(pal.is_active, true)
FROM property_auto_links pal
WHERE pal.property_id = p.id;

CREATE INDEX IF NOT EXISTS idx_properties_auto_link_active
  ON properties(auto_link_active);
