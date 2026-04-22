# Taxonomie hôte HostCheckIn

Audit read-only de `src/lib/i18n/fr.ts` (436 lignes). Objectif Lot 2 : remplacer le jargon technique par un vocabulaire d'hôte francophone, concret et rassurant.

## Glossaire jargon → hôte-friendly

| Terme jargon | Terme hôte proposé | Justification | Occurrences fr.ts |
|--|--|--|--|
| check-in (nom technique) | arrivée du voyageur | "Arrivée" est universellement compris par les hôtes FR ; "check-in" devient l'action de vérification uniquement quand indispensable. | 26 |
| check-out | départ | Symétrie avec "arrivée" ; déjà utilisé ailleurs dans le fichier ("checkOut: Départ"). | 1 |
| invité | voyageur | "Voyageur" est le terme Airbnb officiel en FR ; "invité" est ambigu (familial). Le fichier mélange déjà les deux. | 18 |
| blacklist / blacklisté / liste noire | liste de voyageurs bloqués | Anglicisme connoté ; "bloqué" est neutre et explicite. | 8 |
| onboarding | prise en main | Anglicisme inutile ; "prise en main" dit exactement la fonction. | 3 |
| dashboard / tableau de bord | tableau de bord | OK tel quel, déjà francisé. "Dashboard" à bannir s'il apparaît en RAW. | 4 (FR) |
| hosting ("bon hosting") | bonne location | Anglicisme ; "bonne location" ou "bonnes réservations" sonne hôte FR. | 1 |
| checklist | liste d'étapes | "Checklist" est toléré mais "liste d'étapes" est plus clair pour les débutants. | 1 |
| CAPTCHA / hCaptcha / jeton hCaptcha | vérification anti-robot | Termes techniques invisibles pour l'hôte ; à masquer côté UI. | 3 |
| token / jeton | code de sécurité | "Jeton" sonne abstrait ; "code de sécurité" parle à tous. | 1 |
| CIN | Carte d'identité | Sigle marocain peu connu hors Maghreb ; libellé complet plus clair. | 1 |
| QR Code | QR code (minuscule) | Entré dans le langage courant ; normaliser la casse. | 2 |
| smart lock / serrure connectée | code d'accès | "Code d'accès" est ce que l'hôte partage réellement ; "serrure connectée" reste en libellé technique unique. | 4 |
| PDF | document PDF | Entré dans le langage courant ; OK tel quel. | 2 |
| More / Upgrade (topnav EN) | Plus / Passer à l'offre supérieure | Deux valeurs en anglais dans un fichier FR — à franciser sans débat. | 2 |
| mode démo | aperçu test | "Démo" OK mais "aperçu test" plus explicite côté hôte. | 2 |
| iframe (iframeTitle) | fenêtre d'aperçu | Terme dev exposé sans raison dans un attribut aria. | 1 |
| aria (labels) | libellé accessible | Terme dev inévitable en clé ; valeur reste FR naturelle. | 15 clés |
| automatisations / automatiser | envois automatiques | "Automatisation" reste abstrait ; préciser "envois automatiques" sur les CTA. | 4 |
| selfie | photo de vérification | "Selfie" OK en démo, mais "photo de vérification" plus pro dans les libellés contractuels. | 1 |
| dépôt non versé | caution non reçue | "Dépôt" est juridique ; "caution" est le mot de tous les hôtes courte durée FR. | 1 |
| Registres à jour | Fiches voyageurs à jour | "Registres" évoque la police ; "fiches voyageurs" est plus doux et exact. | 1 |
| Taux de vérification | Vérifications réussies | "Taux" est froid ; formulation directe plus rassurante. | 1 |
| Taux d'occupation | Taux d'occupation | Terme métier standard ; conserver. | 1 |
| RGPD | conforme RGPD | OK tel quel, rassurant pour le voyageur français. | 2 |
| Veuillez (+ infinitif) | impératif direct | Ton trop administratif ; "Validez", "Collez", "Réessayez". | 4 |
| Propriétés / Propriété (menu) | Logements | Déjà mixé dans le fichier (sidebar "Propriétés" vs topnav "Logements") ; unifier sur "Logements". | ~6 |
| Référence de réservation | Numéro de réservation | "Référence" sonne admin ; "numéro" plus simple. | 2 |
| Facturation | Facturation | OK, terme courant. | 3 |

### Termes techniques ABSENTS du fichier (bonne nouvelle)

Aucune occurrence relevée pour : `webhook`, `API`, `payload`, `KYC`, `OTP`, `hash`, `SSO`, `pipeline`, `workflow`, `deposit` (EN), `signature électronique` brut (seul "signés électroniquement" apparaît, acceptable), `ID KYC`. Le fichier est déjà relativement épuré côté back-jargon.

## Règles d'écriture

- Pas d'anglicisme sauf termes entrés dans le langage courant (email, SMS, WhatsApp, Airbnb, PDF, QR code, WhatsApp).
- Ton direct et rassurant, pas de condescendance.
- Pas de "veuillez" : préférer l'impératif simple ("Validez le CAPTCHA").
- Toujours préciser le genre et le pluriel (voyageur·se·s → "voyageurs" neutre accepté).
- Un terme = un libellé : ne pas alterner "invité" / "voyageur" ni "propriété" / "logement" / "hébergement" dans la même app.
- Les sigles locaux (CIN) doivent être suivis de leur forme longue au premier usage.
- Libellés aria en phrase complète à l'infinitif ("Ouvrir le menu") ou impératif, jamais en jargon dev.
- Les labels techniques invisibles (captcha, iframe, jeton) doivent être masqués côté UI ou rebrandés.

## Cas sensibles (décision user requise)

1. **invité vs voyageur** : le fichier mélange les deux systématiquement (ex. `guestFallbackName: "Invité"` mais `guestsLabel: "Voyageurs"`). Il faut trancher : recommandation = **voyageur** (aligné Airbnb), mais impact sur ~18 clés. Décision métier.
2. **propriété vs logement vs hébergement** : trois termes coexistent (`sidebar.properties: "Propriétés"`, `topnav.properties: "Logements"`, `reservationsFilters.property: "Hébergement"`). Recommandation = **logement** (terme grand public). Validation produit nécessaire.
3. **check-in (mot générique)** : le produit s'appelle "HostCheckIn". Supprimer totalement "check-in" casserait le branding. Proposition : garder "check-in" uniquement dans les titres de section (`sidebar.menu.checkins`, `profile.sections.checkin`) et remplacer par "arrivée" dans les descriptions et CTA. À arbitrer.
