# Capture Avant / Après — Onboarding Dashboard

## Avant
- Le nouvel utilisateur atterrit sur `/` (dashboard) après authentification.
- Le dashboard affiche un en-tête simple, puis les KPI/cartes.
- L’ancienne checklist était positionnée en bas du dashboard (et sur Profil), avec 7 étapes orientées profil.
- Pas de modèle d’étapes configurable en base par utilisateur.

## Après
- La checklist onboarding est affichée **en haut du dashboard**, juste sous l’en-tête.
- Nouveau modèle configurable en base: table `onboarding_steps` liée à `hosts.id`.
- États visuels normalisés `done | active | locked` avec CTA unique par étape.
- Une fois complétée: bannière dismissible “Votre configuration est terminée” + lien “Revoir l'onboarding”.
- Boutons secondaires de confiance: “Réserver un appel 1:1” + “Centre d'aide”.

## Captures recommandées (staging)
1. Dashboard nouveau compte (étape active visible).
2. Dashboard avec 2 étapes done, 1 active, 1 locked.
3. Dashboard avec onboarding terminé (bannière).
