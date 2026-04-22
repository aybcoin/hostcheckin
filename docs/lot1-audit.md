# Lot 1 — Audit des couleurs Tailwind hardcodées (AVANT)

## Périmètre et méthode

Audit réalisé sur `src/` avec les patterns demandés :

- `bg-(red|amber|emerald|slate|blue|orange|yellow|green|sky|rose|pink|purple|gray|zinc|stone|neutral)-\d+`
- `text-(...)`
- `border-(...)`

Commandes utilisées : `rg -o` puis agrégation par fichier.

## Totaux globaux (tout `src/`)

- `bg-*`: **191**
- `text-*`: **542**
- `border-*`: **161**
- Total occurrences hardcodées : **894**

Répartition par zone :

- `src/components/reservations/*`: **113** (exclu du Lot 1 selon contrainte)
- `src/components/ui/*`: **17** (exclu du Lot 1 selon contrainte)
- `src/lib/design-tokens.ts`: **70** (source de vérité, exclu du remplacement)
- Périmètre cible Lot 1 (hors exclusions ci-dessus) : **694**

## Conflit de consigne détecté

- Contrainte : **ne pas toucher** `src/components/reservations/*`
- Priorité demandée : commencer par `src/components/reservations/ReservationCard.tsx`

Ce fichier contient actuellement **53** occurrences (6 bg / 38 text / 9 border), mais il est dans le dossier explicitement exclu.  
Proposition pour Lot 1 : respecter l’exclusion et commencer par `VerificationPage.tsx`.

## Comptage AVANT — par fichier (périmètre cible Lot 1)

| Fichier | bg | text | border | Total |
|---|---:|---:|---:|---:|
| `src/components/VerificationPage.tsx` | 29 | 64 | 22 | 115 |
| `src/components/ReservationDocuments.tsx` | 15 | 44 | 8 | 67 |
| `src/components/ContractPage.tsx` | 6 | 43 | 5 | 54 |
| `src/components/Dashboard.tsx` | 7 | 19 | 10 | 36 |
| `src/components/PublicBookingForm.tsx` | 6 | 17 | 9 | 32 |
| `src/components/TopNavigation.tsx` | 9 | 13 | 9 | 31 |
| `src/components/CheckinsPage.tsx` | 5 | 22 | 1 | 28 |
| `src/components/ProfilePage.tsx` | 6 | 16 | 5 | 27 |
| `src/components/calendar/CalendarStats.tsx` | 5 | 22 | 0 | 27 |
| `src/components/OnboardingChecklist.tsx` | 7 | 14 | 3 | 24 |
| `src/components/CheckinMessageTemplates.tsx` | 3 | 14 | 6 | 23 |
| `src/components/AutoLinkGenerator.tsx` | 6 | 12 | 3 | 21 |
| `src/components/BlacklistPage.tsx` | 2 | 17 | 2 | 21 |
| `src/components/PropertiesPage.tsx` | 1 | 15 | 5 | 21 |
| `src/components/SupportButton.tsx` | 7 | 9 | 5 | 21 |
| `src/components/calendar/CalendarGrid.tsx` | 8 | 7 | 5 | 20 |
| `src/components/CalendarPage.tsx` | 0 | 16 | 1 | 17 |
| `src/components/dashboard/RecentActivities.tsx` | 3 | 9 | 4 | 16 |
| `src/components/ReservationsPage.tsx` | 1 | 11 | 2 | 14 |
| `src/components/pricing/PricingCard.tsx` | 2 | 9 | 2 | 13 |
| `src/components/properties/VerificationModeCard.tsx` | 1 | 6 | 4 | 11 |
| `src/components/AuthForm.tsx` | 0 | 7 | 1 | 8 |
| `src/components/dashboard/CheckinsTrendChart.tsx` | 1 | 6 | 1 | 8 |
| `src/components/pricing/PricingToggle.tsx` | 5 | 3 | 0 | 8 |
| `src/components/dashboard/ReservationContextCard.tsx` | 1 | 5 | 1 | 7 |
| `src/components/HelpPage.tsx` | 1 | 5 | 0 | 6 |
| `src/components/SecurityNotice.tsx` | 1 | 2 | 2 | 5 |
| `src/components/navigation/NavigationItem.tsx` | 0 | 3 | 1 | 4 |
| `src/App.tsx` | 2 | 1 | 0 | 3 |
| `src/components/GuestPreviewModal.tsx` | 0 | 2 | 1 | 3 |
| `src/components/PricingPage.tsx` | 0 | 3 | 0 | 3 |

## Fichiers exclus du remplacement (pour traçabilité)

| Fichier | bg | text | border | Total |
|---|---:|---:|---:|---:|
| `src/lib/design-tokens.ts` | 33 | 18 | 19 | 70 |
| `src/components/reservations/ReservationCard.tsx` | 6 | 38 | 9 | 53 |
| `src/components/reservations/CreateReservationModal.tsx` | 0 | 18 | 2 | 20 |
| `src/components/reservations/ShareLinkModal.tsx` | 3 | 12 | 4 | 19 |
| `src/components/ui/Badge.tsx` | 4 | 4 | 4 | 12 |
| `src/components/reservations/ReservationStatusPills.tsx` | 3 | 4 | 4 | 11 |
| `src/components/reservations/RatingModal.tsx` | 0 | 4 | 1 | 5 |
| `src/components/reservations/ReservationFilters.tsx` | 0 | 5 | 0 | 5 |
| `src/components/ui/EmptyState.tsx` | 1 | 3 | 0 | 4 |
| `src/components/ui/Skeleton.tsx` | 1 | 0 | 0 | 1 |

## Stratégie de remplacement (sémantique, pas 1:1)

### 1) Cas déjà couverts par tokens existants

- États métier (erreur, succès, attente, info): `statusTokens.*`
- Boutons d’action: `ctaTokens.*`
- Surfaces de carte/bloc: `cardTokens.variants.*`
- Inputs : `inputTokens.base|readOnly`
- Boutons icône : `iconButtonToken`
- Overlays/modal shell : `modalTokens.overlay|panel`

### 2) Cas non couverts actuellement (nécessitent nouveaux tokens)

Occurrences majoritaires non couvertes par tokens dédiés :

- Typographie neutre (`text-gray-900`, `text-gray-700`, `text-gray-600`, `text-gray-500`, `text-gray-400`, etc.)
- Bordures neutres (`border-gray-200`, `border-gray-300`, `border-slate-100`)
- Surfaces neutres utilitaires (`bg-gray-50`, `bg-gray-100`, `bg-gray-200`)
- Quelques couleurs de statut de widgets spécifiques (`rose`/`orange`/`amber-400`)

### 3) Propositions de tokens à ajouter avant le remplacement massif

1. `textTokens`
   - `title`, `body`, `muted`, `subtle`, `inverse`
   - `danger`, `warning`, `success`, `info` (quand texte coloré seul)

2. `surfaceTokens`
   - `app`, `panel`, `subtle`, `muted`, `elevated`, `overlay`

3. `borderTokens`
   - `default`, `subtle`, `strong`
   - `danger`, `warning`, `success`, `info`

4. `stateFillTokens` (optionnel, utile pour progress/stepper)
   - `success`, `warning`, `danger`, `neutral`

## Ordre de traitement proposé (Lot 1)

En respectant l’exclusion `reservations/*` :

1. `src/components/VerificationPage.tsx`
2. `src/components/ReservationDocuments.tsx`
3. `src/components/ContractPage.tsx`
4. `src/components/Dashboard.tsx` (correspond à “DashboardPage.tsx” dans la consigne)
5. puis ordre décroissant selon la table ci-dessus

## Objectif de sortie Lot 1

Après remplacement :

- grep final (hors `ui/`, hors `reservations/`, hors `design-tokens.ts`) ≤ **5** occurrences résiduelles
- résiduels documentés explicitement (cas exceptionnels visuels)

## Suivi d’exécution (colonne APRÈS)

| Fichier | Total AVANT | Total APRÈS | Statut |
|---|---:|---:|---|
| `src/components/VerificationPage.tsx` | 115 | 0 | ✅ terminé |
| `src/components/ReservationDocuments.tsx` | 67 | 0 | ✅ terminé |
| `src/components/ContractPage.tsx` | 54 | 0 | ✅ terminé |
| `src/components/Dashboard.tsx` | 36 | 0 | ✅ terminé |
| `src/components/dashboard/RecentActivities.tsx` | 16 | 0 | ✅ terminé |
| `src/components/dashboard/CheckinsTrendChart.tsx` | 8 | 0 | ✅ terminé |
| `src/components/dashboard/ReservationContextCard.tsx` | 7 | 0 | ✅ terminé |
| `src/components/PublicBookingForm.tsx` | 32 | 0 | ✅ terminé |
| `src/components/TopNavigation.tsx` | 31 | 0 | ✅ terminé |
| `src/components/CheckinsPage.tsx` | 28 | 0 | ✅ terminé |
| `src/components/ProfilePage.tsx` | 27 | 0 | ✅ terminé |
| `src/components/calendar/CalendarStats.tsx` | 27 | 0 | ✅ terminé |
| `src/components/OnboardingChecklist.tsx` | 24 | 0 | ✅ terminé |
| `src/components/CheckinMessageTemplates.tsx` | 23 | 0 | ✅ terminé |
| `src/components/SupportButton.tsx` | 21 | 0 | ✅ terminé |
| `src/components/PropertiesPage.tsx` | 21 | 0 | ✅ terminé |
| `src/components/BlacklistPage.tsx` | 21 | 0 | ✅ terminé |
| `src/components/AutoLinkGenerator.tsx` | 21 | 0 | ✅ terminé |
| `src/components/calendar/CalendarGrid.tsx` | 20 | 0 | ✅ terminé |
| `src/components/CalendarPage.tsx` | 17 | 0 | ✅ terminé |
| `src/components/ReservationsPage.tsx` | 14 | 0 | ✅ terminé |
| `src/components/pricing/PricingCard.tsx` | 13 | 0 | ✅ terminé |
| `src/components/properties/VerificationModeCard.tsx` | 11 | 0 | ✅ terminé |
| `src/components/pricing/PricingToggle.tsx` | 8 | 0 | ✅ terminé |
| `src/components/AuthForm.tsx` | 8 | 0 | ✅ terminé |
| `src/components/HelpPage.tsx` | 6 | 0 | ✅ terminé |
| `src/components/SecurityNotice.tsx` | 5 | 0 | ✅ terminé |
| `src/components/navigation/NavigationItem.tsx` | 4 | 0 | ✅ terminé |
| `src/components/PricingPage.tsx` | 3 | 0 | ✅ terminé |
| `src/components/GuestPreviewModal.tsx` | 3 | 0 | ✅ terminé |
| `src/App.tsx` | 3 | 0 | ✅ terminé |

## Résultat final Lot 1

- Compteur global après remplacement (périmètre cible, hors `ui/`, hors `reservations/`, hors `design-tokens.ts`) : **0**
- Objectif demandé (`≤ 5`) : **atteint et dépassé**
- Résiduels exceptionnels : **aucun**

## Validation technique finale

- `./node_modules/.bin/tsc --noEmit -p tsconfig.app.json` : ✅
- `./node_modules/.bin/vite build` : ✅
