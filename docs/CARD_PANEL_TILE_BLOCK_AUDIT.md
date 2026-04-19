# Audit Card / Panel / Tile / Block

## 1) Composants recensés dans le repo

### Composants nommés `Card`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/ui/Card.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/pricing/PricingCard.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/dashboard/ReservationContextCard.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/properties/VerificationModeCard.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/OnboardingChecklist.tsx` (`OnboardingChecklistCard`)

### Composants nommés `Panel`
- Aucun composant exporté `*Panel` dédié dans `src/components` (hors variables locales de type panel DOM).

### Composants nommés `Tile`
- Aucun composant exporté `*Tile`.

### Composants nommés `Block`
- Aucun composant exporté `*Block`.

## 2) Variantes visuelles trouvées (avant consolidation)
- Radius mixé: `rounded-lg`, `rounded-xl`, `rounded-2xl`.
- Ombres hétérogènes: `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-2xl`, parfois sans ombre.
- Bordures incohérentes: `border`, `border-2`, `border-dashed`, couleurs gris/slate variées.
- Paddings non harmonisés: `p-3`, `p-4`, `p-5`, `p-6`, combinaisons ad-hoc.
- CTA non unifiés: mélange `<Button />` et `<button>` stylés inline.

## 3) Incohérences majeures identifiées
- Cartes ad-hoc non centralisées sur plusieurs écrans.
- Multiples CTA primaires visibles sur certains écrans.
- Usage de la couleur primaire sur des badges/tags purement informatifs.
- Hiérarchie CTA non uniforme (secondaire/tertiaire/destructif mélangés).

## 4) Consolidation appliquée

### Card system unifié
- `Card` unifié dans `/Users/hammasayoub/Desktop/Tech/project/src/components/ui/Card.tsx`
- Props:
  - `variant`: `default | highlight | danger | ghost`
  - `padding`: `sm | md | lg`
  - `interactive`: `boolean`
- Tokens ajoutés dans `/Users/hammasayoub/Desktop/Tech/project/src/lib/design-tokens.ts` (`cardTokens`)

### CTA hierarchy consolidée
- `Button` enrichi dans `/Users/hammasayoub/Desktop/Tech/project/src/components/ui/Button.tsx`
  - `primary | secondary | tertiary | destructive`
  - compatibilité conservée (`subtle`, `danger`, `dangerSoft`)
- Top navigation: bouton Upgrade rétrogradé en secondaire distinct pour éviter la surcharge de primaires globales.

### Écrans migrés vers `Card` unifié (principaux)
- `/Users/hammasayoub/Desktop/Tech/project/src/components/HelpPage.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/BlacklistPage.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/AutoLinkGenerator.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/PublicBookingForm.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/PricingPage.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/pricing/PricingCard.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/pricing/PricingToggle.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/calendar/CalendarGrid.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/calendar/CalendarStats.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/dashboard/CheckinsTrendChart.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/dashboard/RecentActivities.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/ProfilePage.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/PropertiesPage.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/ReservationsPage.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/CheckinMessageTemplates.tsx`

## 5) Résiduel à migrer (non bloquant fonctionnel)
- `/Users/hammasayoub/Desktop/Tech/project/src/components/ContractPage.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/ReservationDocuments.tsx`
- `/Users/hammasayoub/Desktop/Tech/project/src/components/CalendarPage.tsx` (modale)

Ces fichiers restent fonctionnels, mais gardent des cartes/CTA ad-hoc qui doivent être alignés dans une passe dédiée.
