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
