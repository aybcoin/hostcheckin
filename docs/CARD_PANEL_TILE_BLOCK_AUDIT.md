# Audit Card / Panel / Tile / Block

## 1) Inventaire des composants recensés

### Composants nommés `Card`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/ui/Card.tsx` (composant unifié)
- `/Users/hammasayoub/Desktop/Tech/project/src/components/pricing/PricingCard.tsx` (composant métier pricing)
- `/Users/hammasayoub/Desktop/Tech/project/src/components/dashboard/ReservationContextCard.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/properties/VerificationModeCard.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/OnboardingChecklist.tsx` (`OnboardingChecklistCard`)

### Composants nommés `Panel`
- Aucun composant exporté de type `Panel` (hors refs DOM locales).

### Composants nommés `Tile`
- Aucun composant exporté de type `Tile`.

### Composants nommés `Block`
- Aucun composant exporté de type `Block`.

## 2) Variantes + tokens consolidés

### `Card` unifié
- Props: `variant ('default' | 'highlight' | 'danger' | 'ghost')`
- Props: `padding ('sm' | 'md' | 'lg')`
- Props: `interactive (boolean)`
- Source: `/Users/hammasayoub/Desktop/Tech/project/src/components/ui/Card.tsx`

### Tokens design appliqués
- `cardTokens`: `/Users/hammasayoub/Desktop/Tech/project/src/lib/design-tokens.ts`
- `ctaTokens`: hiérarchie `primary | secondary | tertiary | destructive` (legacy alias conservés)
- `statusTokens`, `inputTokens`, `modalTokens`, `iconButtonToken`

## 3) Incohérences détectées (avant correction)
- Mix radius (`rounded-lg`, `rounded-xl`, `rounded-2xl`) non harmonisé.
- Ombres hétérogènes (`shadow-sm` à `shadow-2xl`) hors logique de priorité.
- Cartes ad-hoc répétées dans pages métier (Contrats, Réservations, Calendrier, Documents).
- CTA stylés inline au lieu d’un `Button` centralisé.
- Plusieurs primaires visibles sur des listes denses.

## 4) Remplacements effectués

- Migration vers `Card` + `Button` sur:
  - `ContractPage`
  - `ReservationDocuments`
  - `CalendarPage`
  - `CheckinsPage`
  - `CreateReservationModal`
  - `ShareLinkModal`
  - `RatingModal`
  - `ReservationsPage`
  - `VerificationModeCard`
  - `AuthForm`
  - `ProfilePage` (sections simples)

- Harmonisation CTA:
  - Les actions secondaires/annulation sont passées en `secondary` ou `tertiary`.
  - Les actions destructives sont passées en `destructive`.
  - Réduction des primaires concurrentes sur les zones listées (notamment Contrats / Check-ins / Réservations).

## 5) Résiduel léger (conservé volontairement)

- `/Users/hammasayoub/Desktop/Tech/project/src/components/VerificationPage.tsx`
  - Surface canvas de signature (`border-2 ... bg-white`) conservée pour la lisibilité de la zone de signature manuscrite.
- `/Users/hammasayoub/Desktop/Tech/project/src/components/ContractPage.tsx`
  - Styles de pastilles de placeholders (`bg-white/70`) conservés car informatifs, non CTA, et intégrés au bloc d’aide.

## 6) Vérifications techniques

- `./node_modules/.bin/tsc --noEmit -p tsconfig.app.json` ✅
- `./node_modules/.bin/vite build` ✅

## 7) Couverture tests demandée

- Tests snapshot Card variants: `tests/unit/card.variants.snapshot.test.tsx` ✅ (fichier présent)
- Test E2E CTA navigation: `tests/e2e/cta-regression.spec.ts` ✅ (fichier présent)
- Limitation environnement: binaires `vitest` et `playwright` absents localement, exécution non possible dans ce runtime.
