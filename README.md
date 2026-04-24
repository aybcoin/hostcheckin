# HostCheckIn

> SaaS de gestion du check-in pour les hôtes de locations courte durée (Airbnb / Booking.com).

[![CI](https://github.com/aybcoin/hostcheckin/actions/workflows/ci.yml/badge.svg)](https://github.com/aybcoin/hostcheckin/actions/workflows/ci.yml)

---

## Présentation

HostCheckIn automatise le processus d'accueil des voyageurs :
- **Portail invité public** — signature de contrat, vérification d'identité (KYC), confirmation
- **Notifications automatiques** — email & SMS via Brevo (rappel check-in J-1, jour J, checkout…)
- **Tableau de bord temps réel** — réservations du jour/semaine, timeline d'activité
- **Score de confiance** — calcul automatique basé sur l'état du dossier invité
- **PWA** — installable sur mobile, fonctionne hors-ligne

---

## Stack technique

| Couche | Technologie |
|--------|------------|
| Frontend | React 18 + TypeScript strict + Vite 5 |
| Styles | Tailwind CSS (design tokens uniquement, 0 couleur hardcodée) |
| Backend | Supabase (PostgreSQL + RLS + Edge Functions Deno) |
| Email / SMS | Brevo API |
| Tests | Vitest (86 tests unitaires) + Playwright (E2E) |
| CI/CD | GitHub Actions |
| PWA | vite-plugin-pwa + Workbox |

---

## Structure du projet

```
src/
├── App.tsx                    # Router — 14 pages en React.lazy + Suspense
├── components/
│   ├── *Page.tsx              # Pages (lazy-loaded)
│   ├── dashboard/             # Sections du tableau de bord
│   ├── guest/                 # Portail invité (4 étapes, sans auth)
│   ├── onboarding/            # Modal 3 étapes (première connexion)
│   ├── reservations/          # Cards, filtres, modales
│   ├── trust/                 # Badge et barre de confiance
│   └── ui/                    # Composants réutilisables
├── hooks/                     # Logique React (Supabase + localStorage)
├── lib/
│   ├── design-tokens.ts       # Source unique des couleurs/styles
│   ├── i18n/fr.ts             # Toutes les chaînes UI en français
│   └── *.ts                   # Fonctions pures (testables)
├── stories/                   # Storybook (7 composants)
├── types/                     # Types TypeScript
supabase/
├── functions/                 # Edge Functions (Deno)
│   ├── send-notification/     # Email + SMS via Brevo
│   ├── generate-contract-pdf/ # Génération PDF contrat
│   └── verify-identity/       # Vérification KYC
└── migrations/                # 15 migrations SQL avec RLS
tests/
├── unit/                      # 86 tests Vitest
└── e2e/                       # Tests Playwright
```

---

## Démarrage rapide

### Prérequis
- Node.js 20+
- Compte Supabase
- Compte Brevo (email/SMS)

### Installation

```bash
git clone https://github.com/aybcoin/hostcheckin.git
cd hostcheckin
npm install
```

### Variables d'environnement

Créer un fichier `.env` :

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Ajouter dans les secrets Supabase Edge Functions :
```
BREVO_API_KEY=xkeysib-...
```

### Développement

```bash
npm run dev          # Vite dev server → http://localhost:5173
npm run storybook    # Storybook → http://localhost:6006
```

### Tests

```bash
npm run type-check   # TypeScript strict
npm run test:unit    # 86 tests Vitest
npm run build        # Build de production
npm run test:e2e     # Tests Playwright
```

---

## Routes principales

| Route | Page | Auth |
|-------|------|------|
| `/` | Dashboard (live Supabase) | ✅ |
| `/reservations` | Liste des réservations | ✅ |
| `/proprietes` | Gestion des propriétés | ✅ |
| `/checkins` | Suivi des check-ins | ✅ |
| `/automatisations` | Règles de notification | ✅ |
| `/parametres` | Paramètres compte | ✅ |
| `/check-in/:token` | Portail invité | ❌ public |

---

## Automatisations (notifications)

5 déclencheurs configurables :

| Déclencheur | Moment |
|-------------|--------|
| `checkin_reminder_j1` | J-1 avant le check-in |
| `checkin_day` | Jour du check-in |
| `checkout_reminder` | Rappel checkout |
| `contract_signed` | Après signature du contrat |
| `verification_complete` | Après vérification KYC |

Canaux : **Email** et/ou **SMS** via Brevo.  
Logs stockés dans la table Supabase `notification_logs`.

---

## Design system

Système de tokens (aucune couleur Tailwind en dur dans les composants) :

```ts
import { ctaTokens, cardTokens, textTokens } from './lib/design-tokens';

// ✅ Correct
<button className={ctaTokens.primary}>Action</button>

// ❌ Interdit
<button className="bg-blue-500">Action</button>
```

Tokens disponibles : `ctaTokens`, `cardTokens`, `statusTokens`, `textTokens`, `surfaceTokens`, `borderTokens`, `stateFillTokens`, `warningTokens`, `infoTokens`.

---

## Base de données

### Tables principales

| Table | Description |
|-------|-------------|
| `properties` | Propriétés de l'hôte |
| `reservations` | Réservations (`check_in_date`, `check_out_date`, `guest_id`, `property_id`) |
| `guests` | Voyageurs (`full_name`, `email`, `phone`) |
| `guest_tokens` | Tokens publics pour le portail invité |
| `notification_logs` | Historique des envois automatiques |

Toutes les tables ont des politiques **RLS** (Row Level Security).

### Migrations

```bash
supabase db push   # Appliquer les migrations localement
```

---

## CI/CD

GitHub Actions — `.github/workflows/ci.yml`

```
push main
    ↓
job: test
    ├── npm install
    ├── tsc --noEmit
    ├── vitest run (86 tests)
    └── vite build
    ↓
job: e2e (continue-on-error)
    ├── playwright install chromium
    └── playwright test
```

---

## Bundle

Code splitting avec React.lazy :
- **Initial:** ~49 KB gzipped (vs 563 KB avant)
- **vendor-react:** react + react-dom
- **vendor-supabase:** @supabase/supabase-js

---

## Fonctionnalités terminées

- [x] Authentification Supabase
- [x] Gestion des propriétés (CRUD)
- [x] Gestion des réservations avec statuts
- [x] Dashboard temps réel (Supabase Realtime)
- [x] Portail invité public (contrat + KYC)
- [x] Score de confiance invité
- [x] Notifications automatiques email/SMS (Brevo)
- [x] Génération PDF contrat
- [x] PWA installable
- [x] Onboarding first-run (3 étapes)
- [x] Toast notifications
- [x] Skeleton loaders + Error Boundary
- [x] Code splitting (49KB initial)
- [x] 86 tests unitaires
- [x] Storybook (7 composants)
- [x] CI/CD GitHub Actions

---

## Licence

Projet privé — tous droits réservés.
