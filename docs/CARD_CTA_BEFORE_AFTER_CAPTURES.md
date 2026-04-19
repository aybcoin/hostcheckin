# Captures Avant / Après (5 écrans minimum)

## État
- La génération automatique de captures n’est pas disponible dans cet environnement (binaire Playwright absent).
- Plan de capture prêt pour exécution locale/staging.

## Écrans à capturer
1. `/dashboard`  
Avant: cartes hétérogènes, CTA majoritairement primaires  
Après: `Card` unifié, hiérarchie CTA clarifiée

2. `/properties`  
Avant: cartes et boutons ad-hoc  
Après: cartes `Card` et CTA via `Button`

3. `/blacklist`  
Avant: sections custom + CTA inline  
Après: sections `Card`, CTA unifiés

4. `/pricing`  
Avant: pricing cards custom + CTA non harmonisés  
Après: `Card` unifié, primaire unique recommandé

5. `/book/{token}` (Public booking)  
Avant: wrappers ad-hoc  
Après: surfaces critiques migrées vers `Card`

## Commandes recommandées (si Playwright est installé)
```bash
./node_modules/.bin/playwright test tests/e2e/navigation-mobile.spec.ts tests/e2e/navigation-desktop-active.spec.ts tests/e2e/cta-regression.spec.ts
```
