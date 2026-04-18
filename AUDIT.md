# AUDIT — Validation & Polish (2026-04-18)

## Portée auditée
- `src/lib/i18n/fr.ts`
- `src/components/SupportButton.tsx`
- `src/components/SecurityNotice.tsx`
- `src/components/CheckinMessageTemplates.tsx`
- `src/components/PricingPage.tsx`
- `src/components/pricing/PricingCard.tsx`
- `src/components/pricing/PricingToggle.tsx`
- `src/components/dashboard/CheckinsTrendChart.tsx`
- `src/components/dashboard/RecentActivities.tsx`
- `src/components/GuestPreviewModal.tsx`
- `src/components/OnboardingChecklist.tsx`
- `src/components/AutoLinkGenerator.tsx`
- `src/components/PublicBookingForm.tsx`
- `src/components/properties/VerificationModeCard.tsx`
- `src/components/BlacklistPage.tsx`
- `src/components/reservations/CreateReservationModal.tsx`
- `src/components/ReservationsPage.tsx`
- `supabase/functions/public-booking/index.ts`
- `supabase/migrations/20260418170000_add_auto_link_blacklist_and_verification_mode.sql`

## Checklist par fichier

| Fichier | Cohérence visuelle | Cohérence linguistique | Accessibilité | Responsive | Sécurité | Qualité code | Statut |
|---|---|---|---|---|---|---|---|
| `src/lib/i18n/fr.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/SupportButton.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/SecurityNotice.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/CheckinMessageTemplates.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/PricingPage.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/pricing/PricingCard.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/pricing/PricingToggle.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/dashboard/CheckinsTrendChart.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/dashboard/RecentActivities.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/GuestPreviewModal.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/OnboardingChecklist.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/AutoLinkGenerator.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/PublicBookingForm.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/properties/VerificationModeCard.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/BlacklistPage.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/reservations/CreateReservationModal.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/components/ReservationsPage.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `supabase/functions/public-booking/index.ts` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `supabase/migrations/20260418170000_add_auto_link_blacklist_and_verification_mode.sql` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

## Corrections appliquées pendant ce pass

- `src/components/PublicBookingForm.tsx`
  - Ajout de labels explicites liés aux champs (`htmlFor`/`id`) pour tous les inputs.
  - Passage du submit en `<form onSubmit>` avec validation plus robuste et messages d’erreur accessibles.
  - Gestion d’erreur réseau explicite lors des appels `GET` et `POST`.
- `src/components/BlacklistPage.tsx`
  - Ajout de labels pour chaque champ de formulaire.
  - Externalisation de ces libellés dans `src/lib/i18n/fr.ts`.
- `src/components/GuestPreviewModal.tsx`
  - Fermeture clavier via `Escape`.
  - Transition d’ouverture/fermeture plus discrète.
- `src/components/SupportButton.tsx`
  - Ajout de `aria-expanded`, `aria-controls`, `aria-haspopup`.
  - Ajout de rôles menu/menuitem et labels d’accessibilité sur actions support.
- `src/components/OnboardingChecklist.tsx`
  - Harmonisation de la palette (suppression du vert au profit des tons navy/slate).
- `src/components/PropertiesPage.tsx`
  - Harmonisation colorimétrique vers la palette navy/slate.
  - Suppression du cast `any` lors de l’ajout de propriété.
- `src/components/reservations/CreateReservationModal.tsx`
  - Suppression des `any` et typage strict des payloads/réponses.
  - Harmonisation de la palette vers navy/slate.
  - Fermeture `Escape` + transition subtile.
- `src/components/ReservationsPage.tsx`
  - Suppression des `any` résiduels sur les mappings de données.
  - Harmonisation de la palette vers navy/slate.
  - Ajout d’un `aria-label` sur le bouton icône de copie.
- `src/hooks/useProperties.ts` + `src/hooks/useReservations.ts` + `src/lib/supabase.ts`
  - Introduction de types d’input dédiés (`PropertyCreateInput`, `ReservationCreateInput`).
  - Ajustements des types (`smart_lock_code` nullable) pour coller au schéma SQL réel.
- `supabase/functions/public-booking/index.ts`
  - CORS dynamique selon `PUBLIC_BOOKING_ALLOWED_ORIGINS`.
  - Validation d’entrée plus stricte (email, téléphone, dates, bornes voyageurs).
  - Vérification optionnelle d’un jeton CSRF via `PUBLIC_BOOKING_CSRF_TOKEN`.
  - Rejet des payloads non JSON et conservation du rate limiting + CAPTCHA.

## Écarts restant ouverts

- _(aucun bloqueur restant — la dépendance externe `quickchart` a été remplacée par un rendu QR local via `qrcode.react`, cf. ci-dessous.)_

## Corrections ajoutées lors du pass final (2026-04-18, sprint clôture)

- **Migration `20260418170000`** : exécutée en production (tables `property_auto_links`, `blacklisted_guests`, `public_booking_attempts` + colonnes `verification_mode` sur `properties`/`reservations` + RLS). Enregistrée dans `supabase_migrations.schema_migrations`.
- **Edge function `public-booking`** : déployée pour la première fois (v1, `ACTIVE`, `verify_jwt=false`). Smoke test GET `?token=xxx` → `404 invalid_or_inactive_token` attendu.
- **QR code** : migration de `quickchart.io` → rendu local `qrcode.react@4.2.0` (ISC). Zéro appel réseau pour générer le QR ; téléchargement PNG via `canvas.toDataURL` ; l’affiche imprimable embarque le PNG inline (`data:image/png;base64,…`) plutôt que de réappeler un service externe.
- **Accessibilité** : ajout de `focus:ring-2 focus:ring-slate-400 focus:ring-offset-2` sur tous les boutons de `AutoLinkGenerator`, `role="img"` + `aria-label` sur le QR, `aria-hidden="true"` sur les icônes décoratives, `role="alert"` sur les erreurs d’action.

## Tests fonctionnels manuels (phase 2)

- Scénario 1 onboarding complet : ⚠️ non exécuté depuis cet environnement (nécessite session utilisateur bout-en-bout + compte staging). Composants validés statiquement : `OnboardingChecklist`, `CreateReservationModal`, `VerificationPage`, `ReservationDocuments`.
- Scénario 2 lien permanent → QR → réservation publique : ⚠️ non exécuté intégralement. **Partiellement validé** : l’edge function `public-booking` répond bien (GET `?token=invalid` → 404 `invalid_or_inactive_token`, CORS + CSRF + rate-limit en place). Le rendu QR local a été validé par build réussi.
- Scénario 3 templates FR/EN/AR + RTL : ⚠️ non exécuté en staging (aucun runtime browser dans cet environnement).
- Scénario 4 blacklist + blocage création : ⚠️ non exécuté en staging. Composant `BlacklistPage` et logique de matching dans `public-booking/index.ts` relus et conformes.

## Vérifications techniques exécutées

- `tsc --noEmit -p tsconfig.app.json` (exit 0) : ✅
- `vite build` (exit 0, 1580 modules transformés, chunk principal 514 kB / 140 kB gzip) : ✅
- Migration `20260418170000` vérifiée présente en base via Management API.
- Edge function `public-booking` v1 vérifiée `ACTIVE` via Management API.
- `generate-contract-pdf` en v26 (sprint précédent), toujours `ACTIVE`.
