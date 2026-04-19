# CHANGELOG

## 2026-04-19 — V2 polish (LOT A + LOT B)

### LOT A — Critique
- A1. Audit complet de l'accentuation française : aucun texte UX hardcodé sans accent.
  Tous les libellés produits sont centralisés dans `src/lib/i18n/fr.ts` avec namespaces
  `contracts`, `calendar`, `checkin`, `profile`, `blacklist`, `reservations`, `pricing`,
  `common`, `support`, `security`, `publicBooking`, `app`, `sidebar`.
- A2. Logo sidebar : bouton de fermeture repositionné en haut/droite absolu, le libellé
  "HostCheckIn" s'affiche intégralement à toutes les tailles.
- A3. Module Support permanent : `SupportButton` placé en bas de sidebar, dropdown
  WhatsApp / e-mail / documentation, variables `VITE_SUPPORT_WHATSAPP` et
  `VITE_SUPPORT_EMAIL`.
- A4. Design tokens CTA centralisés (`src/lib/design-tokens.ts`) : `cta-primary`,
  `cta-secondary`, `cta-success`, `cta-danger`, `cta-danger-soft`. Refactor de
  AutoLinkGenerator, PublicBookingForm, BlacklistPage, ProfilePage, ShareLinkModal,
  RatingModal, ReservationFilters, HelpPage.
- A5. Placeholders téléphone alignés sur le marché Maroc : `Ex : 06 12 34 56 78`
  (centralisé dans `fr.profile.phonePlaceholder`).

### LOT B — Haute
- B1. Élévation de `/book/{token}` : bandeau dégradé navy/teal cohérent avec
  `/checkin/`, badge "Réservation 100% sécurisée", footer RGPD, carte centrale
  arrondie + ombre douce.
- B2. `BlacklistPage` : bouton d'ajout `cta-primary` activé dès qu'au moins un
  identifiant est renseigné, sinon désactivé avec tooltip "Renseignez au moins un
  identifiant".
- B3. Régénération + désactivation du lien permanent :
  - `AutoLinkGenerator` : actions "Régénérer" et "Désactiver" avec confirmations.
  - Edge function `public-booking` (v2) : refus si `auto_link_active === false`.
  - Migration `20260419090000_add_auto_link_active_to_properties.sql` : colonnes
    `auto_link_active` (bool) et `auto_link_regenerated_at` (timestamptz) sur
    `properties`, index sur `auto_link_active`.
- B4. Templates de message : ajout de l'espagnol (FR / EN / AR / ES).

## 2026-04-18

### Sprint 1 — Lot 1 (base produit)
- Centralisation des libellés français dans `src/lib/i18n/fr.ts`.
- Correction des libellés UI majeurs (Réservations, accents, statuts, actions).
- Ajout du bouton de support permanent en bas de sidebar (`SupportButton`).
- Ajout de la notice sécurité et du filigrane sur les documents d’identité.
- Ajout des templates de messages check-in avec variables et personnalisation inline.

### Sprint 2 — Lot 2 (impact fort)
- Ajout de la page `Abonnement` avec toggle Mensuel/Annuel et 3 plans.
- Enrichissement du tableau de bord :
  - courbe check-ins 30 jours,
  - activités récentes,
  - checklist d’onboarding avec progression.
- Ajout de la modale `Aperçu invité (démo)` intégrée à la page Check-ins.
- Ajout de la checklist d’onboarding sur la page Profil.
- Affichage du code de serrure sur l’écran final invité après validation.

### Sprint 3 — Lot 3 (différenciation)
- Génération de lien permanent par propriété + QR code + affiche imprimable.
- Ajout de la route publique `/book/{token}` avec formulaire de réservation.
- Ajout du mode de vérification configurable par propriété (simple/complète) et override réservation.
- Ajout de la page `Liste noire` + blocage manuel + blocage depuis réservation.
- Ajout d’une protection anti-abus sur route publique :
  - table `public_booking_attempts`,
  - limitation par IP,
  - CAPTCHA hCaptcha requis au-delà d’un seuil.

### Sprint 3 — Validation & Polish (phase 2)
- Audit qualité formalisé dans `AUDIT.md` (checklist visuelle, linguistique, accessibilité, sécurité).
- Harmonisation supplémentaire de la palette vers navy/slate sur les modules réservation/propriété.
- Suppression des `any` introduits dans les nouveaux lots et renforcement du typage des payloads.
- Renforcement accessibilité:
  - labels explicites sur formulaires publics et blacklist,
  - attributs ARIA sur menu support et actions icônes,
  - fermeture clavier (`Escape`) sur modales clés.
- Durcissement de `public-booking`:
  - validation d’entrées plus stricte,
  - contrôle `Content-Type`,
  - CORS dynamique selon origines autorisées,
  - garde-fou CSRF optionnel via header.
- Renforcement de l’expérience `AutoLinkGenerator`:
  - états skeleton et erreurs explicites,
  - téléchargement QR plus robuste,
  - gestion d’échec d’impression (popup bloquée).
- Ajout de `docs/DEPLOYMENT_NOTES.md` (env, migrations, contrôles staging).
