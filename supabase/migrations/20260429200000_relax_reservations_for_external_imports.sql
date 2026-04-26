-- HostCheckIn — Relax reservations constraints to support external imports (iCal sync)
-- Imported reservations from Airbnb/Booking/Vrbo only carry dates + a UID; they do NOT carry
-- guest identity, a unique_link, or a host-defined booking reference. We therefore:
--   1. Make `guest_id` nullable. Existing app code already gracefully handles missing guest
--      (see `guests[reservation.guest_id]` lookups returning undefined → fallback name).
--   2. Provide a DEFAULT for `unique_link` so iCal imports don't have to invent one.
--   3. Keep `booking_reference NOT NULL UNIQUE` — the iCal hook fills it from the event UID
--      or summary slice, which is unique per feed.
-- This is a one-way relaxation; nothing previously valid becomes invalid.

-- =========================================================================
-- guest_id → nullable
-- =========================================================================

ALTER TABLE reservations
  ALTER COLUMN guest_id DROP NOT NULL;

COMMENT ON COLUMN reservations.guest_id IS
  'FK to guests. NULL allowed for reservations imported from external sources (iCal) before the host enriches them with guest details.';

-- =========================================================================
-- unique_link → DEFAULT random uuid string (still UNIQUE NOT NULL)
-- =========================================================================

-- Use a stable default expression so an iCal insert that omits unique_link gets a unique value.
ALTER TABLE reservations
  ALTER COLUMN unique_link SET DEFAULT gen_random_uuid()::text;

-- =========================================================================
-- number_of_guests → DEFAULT 1 (already has CHECK constraint elsewhere)
-- =========================================================================

ALTER TABLE reservations
  ALTER COLUMN number_of_guests SET DEFAULT 1;
