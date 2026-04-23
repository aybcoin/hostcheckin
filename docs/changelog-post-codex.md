# Changelog Post Codex

## Lot 0

### 1) Audit variants (`grep variant=` + cross-check tokens)

Périmètre audité :
- `/Users/hammasayoub/Desktop/Tech/project/src/lib/design-tokens.ts`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/ui/Button.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/ui/Card.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/ui/Badge.tsx`
- usages `variant=` dans `src/`

Résultat cross-check (composants UI tokenisés) :
- `Button`: aucun variant manquant référencé dans le code.
- `Card`: aucun variant manquant référencé dans le code.
- `Badge`: aucun variant manquant référencé dans le code.

Notes d’audit :
- Les valeurs `desktop | tablet | menu | mobile` trouvées par grep sont des variants internes à `NavigationItem` (navigation), pas des variants de `Button/Card/Badge`.

### 2) Variants ajoutés

- `Badge`: ajout de `warning` et `info` (tout en conservant les variants existants pour compatibilité).
- `Button`: ajout de `warning`.
- `Card`: ajout de `warning` et `info`.

### 3) Nouveaux tokens de design

Ajoutés dans `/Users/hammasayoub/Desktop/Tech/project/src/lib/design-tokens.ts` :
- `warningTokens`
- `infoTokens`

Intégration :
- `ctaTokens.warning` branché sur `warningTokens.cta`.
- `cardTokens.variants.warning` et `cardTokens.variants.info`.
- `statusTokens.warning` et `statusTokens.info`.

### 4) Nouveau composant UI

Créé :
- `/Users/hammasayoub/Desktop/Tech/project/src/components/ui/EmptyState.tsx`

API :
- `props={ icon, title, description, action? }`
- accessibilité : `role="status"` + `aria-live="polite"`

### 5) Qualité de code

- Composition Tailwind alignée tokens + helper `clsx` :
  - `/Users/hammasayoub/Desktop/Tech/project/src/lib/clsx.ts`
  - utilisé dans `Button`, `Card`, `Badge`, `EmptyState`.
- TypeScript strict : aucun `any` introduit.

## Lot 1

### 1) Tokens ajoutés avant remplacement

Ajoutés dans `/Users/hammasayoub/Desktop/Tech/project/src/lib/design-tokens.ts` :
- `textTokens`
- `surfaceTokens`
- `borderTokens`
- `stateFillTokens`

### 2) Remplacement sémantique des couleurs hardcodées

- Remplacement effectué fichier par fichier sur tout le périmètre cible Lot 1.
- Exclusions respectées :
  - `/Users/hammasayoub/Desktop/Tech/project/src/components/reservations/*`
  - `/Users/hammasayoub/Desktop/Tech/project/src/components/ui/*`
  - `/Users/hammasayoub/Desktop/Tech/project/src/lib/design-tokens.ts`
- Approche appliquée :
  - mapping vers `statusTokens` / `surfaceTokens` / `borderTokens` / `textTokens`
  - composition via `clsx()`
  - remplacement métier (erreur/succès/neutralité) plutôt que substitution 1:1

### 3) Résultat de comptage

- Avant (périmètre cible Lot 1) : **694 occurrences**
- Après : **0 occurrence**
- Résiduels exceptionnels : **aucun**

### 4) Validation

- `./node_modules/.bin/tsc --noEmit -p tsconfig.app.json` : ✅
- `./node_modules/.bin/vite build` : ✅

## Lot 2

### 1) Décisions taxonomie appliquées

- `check-in` conservé tel quel partout (aucun remplacement).
- `invité*` remplacé par `voyageur*` dans les chaînes UI (titres, aides, messages, aria-labels, placeholders).
- `propriété` / `hébergement` remplacés par `logement` dans les chaînes UI.

### 2) Quick wins microcopy appliqués

- `Liste noire` remplacé côté UI par `Voyageurs bloqués`.
- `onboarding` remplacé côté UI par `mise en route`.
- `dépôt` (sens caution) remplacé par `caution`.
- Formulations `Veuillez ...` normalisées vers l’impératif direct (`Renseignez`, `Réessayez`, `Contactez`, etc.).
- `CAPTCHA` conservé uniquement quand le contexte est technique (`Jeton hCaptcha`) ; sinon formulation utilisateur `vérification anti-robot`.
- Anglicismes UI résiduels remplacés quand pertinents (`More` → `Plus`, `Upgrade` → `Passer en Pro`).

### 3) Comptage des remplacements (sur le diff Lot 2)

- `invité*` → `voyageur*` : **39** occurrences remplacées.
- `propriété*|hébergement` → `logement` : **30** occurrences remplacées.
- `Veuillez` → impératif direct : **19** occurrences remplacées.
- `onboarding` (UI) → `mise en route` : **5** occurrences remplacées.
- `dépôt` (UI caution) → `caution` : **3** occurrences remplacées.
- `liste noire|blacklist` (UI) → `voyageurs bloqués` : **22** occurrences remplacées.

### 4) Cas ambigus résolus / laissés intacts

- **Conservé** : `check-in` (décision produit explicite).
- **Conservé (technique)** : namespace/identifiants `blacklist` côté code (`blacklist` route interne, clés i18n, types TS, table Supabase `blacklisted_guests`) pour éviter toute régression et respecter la consigne de non-renommage des clés.
- **Conservé** : `propriétaire` (rôle métier) car distinct de `propriété|hébergement`.

### 5) Vérifications

- `./node_modules/.bin/tsc --noEmit -p tsconfig.app.json` : ✅
- `rg -i "\\binvité|propriété|hébergement|veuillez" src/` : ✅ (aucune occurrence)
- `rg -i "\\binvité|propriété|hébergement|blacklist|veuillez" src/` : occurrences restantes **uniquement techniques** sur `blacklist` (identifiants/route/clé/table), pas dans la microcopy utilisateur.

## Lot 4

- Ajout de `src/lib/trust-metrics.ts` : calcul pur `computeTrustMetrics` (signatures, identités, cautions) sur fenêtre glissante UTC.
- Ajout de `src/components/trust/TrustBar.tsx` : barre trust responsive, tooltips CSS-only, ARIA complète.
- Ajout de `src/components/trust/TrustBadge.tsx` : badges contextuels signature/identité/caution via i18n.
- Ajout de `tests/unit/trust-metrics.test.ts` : 10 cas couvrant fenêtre vide/partielle, bornes, données manquantes, ordre, feature flag caution.
- Ajout du namespace `trust` dans `src/lib/i18n/fr.ts` (labels, tooltips, aria, fallback).
- Intégration `TrustBar` dans `Dashboard` et `ReservationsPage` juste après le titre principal.
- Intégration `TrustBadge` dans `ReservationCard` quand contrat signé et identité validée.
- Décision statut signé: `signed_by_guest === true` ou fallback `status === "signed"` si champ dynamique présent.
- Décision statut vérifié: `approved | verified | ok` (tolérance ascendante de statuts backend).
- `tsc --noEmit -p tsconfig.app.json` : ✅
- `vite build` : ✅

## Lot 5

- Création de `src/components/SecurityPage.tsx` : page `/securite` en 4 sections Card (ShieldCheck, FileCheck, Lock, LifeBuoy), grille 1-col mobile / 2-col tablet+.
- Tokens exclusivement (`textTokens`, `cardTokens`, `ctaTokens`) — 0 couleur hardcodée.
- Namespace `security.page` ajouté dans `src/lib/i18n/fr.ts` (20 clés) ; namespace existant `security` étendu avec `sections.security`, `sectionDescriptions.security` et `openSecurity` pour ProfilePage.
- Route `/securite` ajoutée : `AppPage` étendu d'une valeur `'security'`, `APP_PAGE_PATHS['security'] = '/securite'` dans `src/lib/navigation.ts`.
- Import `SecurityPage` + bloc conditionnel `currentPage === 'security'` ajouté dans `src/App.tsx`.
- Lien "Sécurité & confidentialité" ajouté dans le menu latéral de `src/components/ProfilePage.tsx` via `renderSimpleSection`.
- `tsc --noEmit -p tsconfig.app.json` : ✅
- `vite build` : ✅

## Lot 3

- Refonte Dashboard V2 livrée via [src/components/DashboardPage.tsx](/Users/hammasayoub/Desktop/Tech/project/src/components/DashboardPage.tsx) (mobile-first, 3 zones stables).
- Rendu principal migré vers `DashboardPage` depuis [src/App.tsx](/Users/hammasayoub/Desktop/Tech/project/src/App.tsx), avec un alias de compatibilité maintenu dans [src/components/Dashboard.tsx](/Users/hammasayoub/Desktop/Tech/project/src/components/Dashboard.tsx).
- `DashboardPage` branché sur `reservationsLoading` pour activer les squelettes au premier chargement.
- Nouveau module pur [src/lib/dashboard-data.ts](/Users/hammasayoub/Desktop/Tech/project/src/lib/dashboard-data.ts) :
  - `computeTodayItems` (urgences du jour, tri urgence+heure, max 5)
  - `computeWeekItems` (J+1..J+7 avec actions requises)
  - `computeActivityTimeline` (fusion contrats/identités/cautions/check-in/réservations)
- Nouvelles sections UI :
  - [src/components/dashboard/TodaySection.tsx](/Users/hammasayoub/Desktop/Tech/project/src/components/dashboard/TodaySection.tsx)
  - [src/components/dashboard/WeekSection.tsx](/Users/hammasayoub/Desktop/Tech/project/src/components/dashboard/WeekSection.tsx)
  - [src/components/dashboard/ActivityTimeline.tsx](/Users/hammasayoub/Desktop/Tech/project/src/components/dashboard/ActivityTimeline.tsx)
- i18n enrichi dans [src/lib/i18n/fr.ts](/Users/hammasayoub/Desktop/Tech/project/src/lib/i18n/fr.ts) (`dashboard.today|week|activity` + labels/actions/messages).
- TrustBar conservée et intégrée dans la nouvelle hiérarchie.
- Aucun N+1 ajouté : réutilisation des données existantes via `useDashboardSignals` + `useMemo`.
- Tests ajoutés :
  - [tests/unit/dashboard-data.test.ts](/Users/hammasayoub/Desktop/Tech/project/tests/unit/dashboard-data.test.ts) (20+ cas)
  - [tests/e2e/dashboard-flow.spec.ts](/Users/hammasayoub/Desktop/Tech/project/tests/e2e/dashboard-flow.spec.ts)
- Test e2e existant aligné avec la nouvelle zone Aujourd’hui :
  - [tests/e2e/dashboard-priority.spec.ts](/Users/hammasayoub/Desktop/Tech/project/tests/e2e/dashboard-priority.spec.ts)
- Dead code check :
  - `git grep "DashboardLegacy" src` → 0 référence.
- Widgets dashboard orphelins supprimés :
  - [src/components/dashboard/CheckinsTrendChart.tsx](/Users/hammasayoub/Desktop/Tech/project/src/components/dashboard/CheckinsTrendChart.tsx)
  - [src/components/dashboard/RecentActivities.tsx](/Users/hammasayoub/Desktop/Tech/project/src/components/dashboard/RecentActivities.tsx)
  - [src/components/dashboard/ReservationContextCard.tsx](/Users/hammasayoub/Desktop/Tech/project/src/components/dashboard/ReservationContextCard.tsx)
- Validation technique locale :
  - `tsc --noEmit -p tsconfig.app.json` ✅
  - `vite build` ✅

## Lot 9

- Vitest détecté dans `devDependencies` (`vitest@4.1.5`, `@vitest/coverage-v8@4.1.5`), sans réinstallation possible via `npm` (binaire indisponible dans l’environnement).
- Configuration test ajoutée à [vite.config.ts](/Users/hammasayoub/Desktop/Tech/project/vite.config.ts) (`globals`, `environment: node`, `include: tests/unit/**/*.test.ts`).
- Configuration harmonisée dans [vitest.config.ts](/Users/hammasayoub/Desktop/Tech/project/vitest.config.ts) pour éviter les divergences.
- Correctif environnement Vitest: fallback WASM rolldown activé via `NAPI_RS_FORCE_WASI=1`.
- Dépendances WASM manquantes installées localement dans `node_modules` (`@rolldown/binding-wasm32-wasi`, `@napi-rs/wasm-runtime`, `@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`, `@tybys/wasm-util`, `tslib`).
- Résultat `tests/unit/trust-metrics.test.ts`: **10 pass / 0 fail / 0 skip**.
- Résultat `tests/unit/dashboard-data.test.ts`: **23 pass / 0 fail / 0 skip**.
- Résultat `tests/unit/reservations-status.test.ts`: **32 pass / 0 fail / 0 skip**.
- Résultat global `tests/unit/`: **65 pass / 0 fail / 0 skip**.
- Validation finale: `vitest` ✅, `tsc --noEmit -p tsconfig.app.json` ✅, `vite build` ✅.

## Lot 10

- Ajout de stories CSF3 + autodocs dans `src/stories/`:
  - [Button.stories.tsx](/Users/hammasayoub/Desktop/Tech/project/src/stories/Button.stories.tsx)
  - [Card.stories.tsx](/Users/hammasayoub/Desktop/Tech/project/src/stories/Card.stories.tsx)
  - [Badge.stories.tsx](/Users/hammasayoub/Desktop/Tech/project/src/stories/Badge.stories.tsx)
  - [EmptyState.stories.tsx](/Users/hammasayoub/Desktop/Tech/project/src/stories/EmptyState.stories.tsx)
  - [ReservationStatusPills.stories.tsx](/Users/hammasayoub/Desktop/Tech/project/src/stories/ReservationStatusPills.stories.tsx)
  - [TrustBar.stories.tsx](/Users/hammasayoub/Desktop/Tech/project/src/stories/TrustBar.stories.tsx)
  - [TrustBadge.stories.tsx](/Users/hammasayoub/Desktop/Tech/project/src/stories/TrustBadge.stories.tsx)
- Storybook discovery élargie dans [.storybook/main.ts](/Users/hammasayoub/Desktop/Tech/project/.storybook/main.ts) pour inclure `../src/stories/**/*.stories.@(ts|tsx)`.
- Shim de types Storybook ajouté pour TypeScript strict sans dépendance runtime locale:
  - [src/types/storybook-react.d.ts](/Users/hammasayoub/Desktop/Tech/project/src/types/storybook-react.d.ts)
- Contrôles `argTypes` ajoutés (variants/sizes/types), sans `any`.
- Validation après ajout stories: `tsc` ✅, `vitest` ✅, `vite build` ✅.

## Lot 7

### Audit responsive mobile 375px — problèmes trouvés par fichier

- **ReservationsPage.tsx** : état vide `p-12` — padding excessif sur 375px, le bloc débordait visuellement en réduisant l'espace utile.
- **ProfilePage.tsx** : `flex gap-3` sans `flex-wrap` sur la rangée de boutons Enregistrer/Annuler — risque de débordement horizontal sur très petits écrans avec libellés longs.
- **DashboardPage.tsx** : aucun problème détecté (layout 1 colonne, skeletons `w-full`, tokens corrects).
- **TopNavigation.tsx** : aucun problème détecté (hamburger mobile, menu plein écran `fixed inset-0`, brand + bouton bien dimensionnés dans `px-4`).
- **SecurityPage.tsx** : aucun problème détecté (grille `grid-cols-1 md:grid-cols-2`, `min-w-0` sur contenus, `flex-wrap` sur badges).
- **ReservationCard.tsx** : aucun problème bloquant — le container CTA a déjà `flex-wrap`, la grille détail est `grid-cols-2` (acceptable sur 375px), les images ont `flex-wrap`.
- **Modales (CreateReservationModal, ShareLinkModal, RatingModal, ReservationDocuments)** : toutes utilisent `modalTokens.panel` qui contient déjà `max-h-[90vh] overflow-y-auto` — conformes.

### Corrections appliquées

- `src/components/ReservationsPage.tsx` : `p-12` → `p-6 sm:p-12` sur le bloc état vide.
- `src/components/ProfilePage.tsx` : `flex gap-3` → `flex flex-wrap gap-3` sur la rangée boutons Enregistrer/Annuler.

### Validation

- `tsc --noEmit -p tsconfig.app.json` ✅
- `vite build` ✅

---

## Lot 8 — Accessibilité globale (a11y)

### Audit (5 fichiers)

- `Button.tsx` : `focus-visible:ring-2` absent — corrigé.
- `TopNavigation.tsx` : skip link absent — corrigé. Boutons hamburger/close avaient déjà `aria-label` via i18n.
- `ReservationCard.tsx` : tous les boutons icon-only avaient `aria-label`, icônes avec `aria-hidden="true"` — rien à corriger.
- `DashboardPage.tsx` : aucun bouton icon-only, aucune lacune — rien à corriger.
- `ProfilePage.tsx` : 4 inputs sans association `htmlFor`/`id`, 4 icônes dans labels sans `aria-hidden` — corrigés.

### Corrections appliquées

- `src/components/ui/Button.tsx` : 1 correction — ajout `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2` sur le bouton de base.
- `src/components/TopNavigation.tsx` : 1 correction — ajout du skip link `<a href="#main-content">Aller au contenu</a>` (sr-only, visible au focus).
- `src/components/ProfilePage.tsx` : 8 corrections — `htmlFor`/`id` sur 4 paires label/input + `aria-hidden="true"` sur 4 icônes décoratives dans les labels.

### Validation

- `tsc --noEmit -p tsconfig.app.json` ✅
- `vite build` ✅
