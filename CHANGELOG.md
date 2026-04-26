## UX Refresh - 2026-04-26

### Lot 1
- Added `StatusBadge`, `ErrorState`, `DataBoundary`, and generic `KpiCard` UI primitives.
- Added 41 new unit tests covering badge rendering, error handling, boundary behavior, KPI cards, and monthly reservation block logic.
- Extended `fr.ts` with shared error, accessibility, dashboard, reservations, navigation, and properties strings.

### Lot 2
- Reworked `DashboardPage` header and replaced the former trust bar with a responsive 4-card KPI grid.
- Added a computed KPI for active reservations in the current month via `useDashboardData`.
- Limited “Aujourd’hui” to 3 items with a full agenda CTA and overflow indicator.
- Refactored the 9 operational dashboard widgets into a compact grid layout with a shared shell and `DataBoundary`-based loading/error handling.
- Switched the reservation approval action to the green primary button treatment.

### Lot 3
- Strengthened sidebar active states with a left accent rail, stronger active typography, and updated icon emphasis.
- Increased spacing between navigation groups and added separators for clearer hierarchy.
- Replaced the previous upgrade CTA with a dismissible Pro banner persisted in `localStorage`.

### Lot 4
- Added reservations list/calendar view toggle with `localStorage` persistence.
- Added monthly `CalendarView` with month navigation, property rows, reservation blocks, and click-through back to the list.
- Added pure `computeReservationBlocks` logic with dedicated unit coverage.

### Lot 5
- Refactored `PropertiesPage` into a responsive card grid.
- Added `PropertyCard` with image/fallback media, compact stats, unified status badge, and icon actions.
- Added `PropertyDetailModal` for full property descriptions.

### Lot 6
- Added `aria-label` coverage on the new icon-only buttons and strengthened focus rings on updated custom controls.
- Replaced high-visibility manual badge patterns with `StatusBadge` in dashboard widgets, reservation status pills, maintenance, housekeeping, messaging, and properties.
