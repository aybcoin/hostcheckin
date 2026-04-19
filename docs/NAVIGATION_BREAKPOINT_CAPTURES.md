# Captures Navigation (Avant / Après)

## État
- Génération automatique indisponible dans cet environnement (binaire Playwright absent).
- Les scénarios de capture ci-dessous sont prêts pour exécution locale/staging.

## Breakpoints à capturer
1. Mobile `375x812`
- Avant: menu latéral hamburger existant
- Après: header compact + menu plein écran + bouton Upgrade en bas

2. Tablette `768x1024`
- Avant: sidebar persistante
- Après: topbar condensée, logique `More` active si > 5 liens

3. Desktop `1280x900`
- Avant: sidebar + états actifs en fond
- Après: topbar unique, soulignement fin actif, avatar dropdown + Upgrade

## Commande recommandée (après installation Playwright)
```bash
./node_modules/.bin/playwright test tests/e2e/navigation-mobile.spec.ts tests/e2e/navigation-desktop-active.spec.ts
```
