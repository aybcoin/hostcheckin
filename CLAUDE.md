# CLAUDE.md — HostCheckIn context file

> Read this at the start of every session. It replaces the need to re-explain the project.

## Project identity

**HostCheckIn** — SaaS B2B for short-term rental hosts (Airbnb / Booking).  
Stack: React 18 + TypeScript strict + Vite 5 + Tailwind CSS + Supabase.  
Repo: `https://github.com/aybcoin/hostcheckin` · branch `main`  
Local: `/Users/hammasayoub/Desktop/Tech/project`

---

## Non-negotiable rules

| Rule | Detail |
|------|--------|
| **0 hardcoded colors** | Always use design tokens from `src/lib/design-tokens.ts` |
| **TypeScript strict** | `strict: true` in tsconfig — no `any`, no type assertions without comment |
| **i18n** | All UI strings from `src/lib/i18n/fr.ts` — single-brace `{variable}` format |
| **No new deps** | Ask before adding any npm package |
| **Supabase RLS** | Every new table needs a migration with RLS policies |
| **Tests** | Pure functions → unit tests in `tests/unit/`. Currently 86 tests. Never break them. |
| **CI** | GitHub Actions runs `tsc --noEmit` + `vitest run` + `vite build` on every push |

---

## Design token system

File: `src/lib/design-tokens.ts`

```ts
ctaTokens      // primary / secondary / danger / ghost buttons
cardTokens     // base / interactive / elevated cards
statusTokens   // success / warning / danger / info status chips
textTokens     // title / body / muted / subtle / inverse / danger / warning
surfaceTokens  // app / card / overlay backgrounds
borderTokens   // default / strong / subtle borders
stateFillTokens // success / danger / warning / info filled states
warningTokens  // cta / status / badge / card (amber)
infoTokens     // cta / status / badge / card (sky)
```

**Pattern:** `className={ctaTokens.primary}` — never `className="bg-blue-500"`.

---

## Architecture

```
src/
├── App.tsx                    # Router — all 14 pages React.lazy() + Suspense
├── main.tsx
├── components/
│   ├── *Page.tsx              # Route-level pages (lazy loaded)
│   ├── dashboard/             # ActivityTimeline, TodaySection, WeekSection
│   ├── guest/                 # GuestStep1–4, GuestPortalLayout (public, no auth)
│   ├── onboarding/            # OnboardingModal (3-step, localStorage)
│   ├── reservations/          # Cards, filters, modals
│   ├── trust/                 # TrustBadge, TrustBar
│   └── ui/                    # Button, Card, Badge, Skeleton, ToastContainer,
│                              #   ErrorBoundary, InstallPWA, EmptyState
├── hooks/
│   ├── useAuth.ts
│   ├── useAutomations.ts      # rules (localStorage) + logs (Supabase)
│   ├── useDashboardData.ts    # Supabase fetch + realtime subscription
│   ├── useGuestPortal.ts      # public fetch by token (no auth)
│   ├── useOnboarding.ts
│   ├── useProperties.ts       # CRUD + optimistic updates
│   ├── useReservations.ts     # realtime INSERT/UPDATE/DELETE
│   └── useToast.ts            # subscribes to toastStore
├── lib/
│   ├── automations-logic.ts   # pure: buildNotificationMessage, defaultRules
│   ├── dashboard-data.ts      # pure: computeTodayItems, computeWeekItems,
│   │                          #   computeActivityTimeline, computeTrustMetrics
│   ├── design-tokens.ts       # ← THE single source of truth for colors
│   ├── i18n/fr.ts             # all French UI strings
│   ├── onboarding.ts          # pure: get/set/complete onboarding state
│   ├── reservations-status.ts # pure: status logic
│   ├── supabase.ts            # Supabase client
│   ├── toast.ts               # lightweight store (no deps)
│   └── trust-metrics.ts       # pure: trust score computation
├── stories/                   # Storybook CSF3 (7 files)
└── types/
    ├── automations.ts         # AutomationRule, NotificationLog, AutomationTrigger
    └── guest-portal.ts        # GuestPortalStep, GuestSession, GuestPortalState
```

---

## Supabase

**Client:** `src/lib/supabase.ts`  
**URL/Key env vars:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Tables (key ones)
| Table | Purpose |
|-------|---------|
| `properties` | Host properties |
| `reservations` | Bookings, with `check_in_date`, `check_out_date`, `guest_id`, `property_id` |
| `guests` | `full_name`, `email`, `phone` |
| `notification_logs` | Automation send history |
| `guest_tokens` | Public tokens for guest portal (RLS: public SELECT on valid tokens) |

### Edge Functions (`supabase/functions/`)
| Function | Purpose |
|----------|---------|
| `send-notification` | Brevo email + SMS (BREVO_API_KEY secret) |
| `generate-contract-pdf` | PDF contract generation |
| `verify-identity` | KYC identity check |
| `log-audit-event` | Audit trail |

### Migrations
All in `supabase/migrations/` — chronological, never modify existing ones.

---

## Email / SMS provider

**Brevo** (single key: `BREVO_API_KEY` Supabase secret)
- Email: `POST https://api.brevo.com/v3/smtp/email`
- SMS: `POST https://api.brevo.com/v3/transactionalSMS/sms`
- If key absent → graceful skip (log `skipped`)

---

## Automations

5 triggers: `checkin_reminder_j1` · `checkin_day` · `checkout_reminder` · `contract_signed` · `verification_complete`  
Rules stored in `localStorage` key `hostcheckin:automations:rules:v1`  
Logs in Supabase `notification_logs` table.

---

## Guest portal (public, no auth)

Route: `/check-in/:token`  
4-step wizard: Welcome → Contract → Identity → Confirmation  
Token validated against `guest_tokens` table (RLS allows public SELECT on non-expired valid tokens).

---

## PWA

`vite-plugin-pwa` + Workbox `NetworkFirst` for Supabase calls.  
Icons: `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`  
Install prompt handled by `src/components/ui/InstallPWA.tsx`.

---

## Toast system

```ts
import { toast } from './lib/toast';
toast.success('Saved');
toast.error('Failed');
toast.warning('Check this');
toast.info('FYI');
```

`ToastContainer` must be mounted once in `App.tsx` (already done).

---

## Bundle

`vite.config.ts` manualChunks:
- `vendor-react` — react + react-dom
- `vendor-supabase` — @supabase/supabase-js

Initial bundle: ~49 KB gzipped (was 563 KB before code splitting).

---

## Tests

```bash
npm run test:unit          # vitest run — 86 tests, 6 files
npm run type-check         # tsc --noEmit
npm run build              # vite build
npm run test:e2e           # playwright (chromium + iPhone 13)
```

Unit test files: `tests/unit/`  
E2E spec files: `tests/e2e/`

**CI:** `.github/workflows/ci.yml` — runs `test` job (type-check + unit + build) + `e2e` job (continue-on-error) on push to `main`.

---

## GitHub / Git

```bash
git remote: https://github.com/aybcoin/hostcheckin.git
PAT tokens: "deploy" and "hostcheckin-deploy" — both have repo + workflow scopes
```

Commit convention: `feat(scope): ...` / `fix(scope): ...` / `refactor(scope): ...`

---

## Codex usage (implementation)

- Use **Codex** (flat-rate) for all implementation tasks
- Use **Claude** only for coordination, audits, config, browser control
- Codex prompt pattern: give the full file list to create/modify + exact spec
- After Codex finishes: run `npm run type-check && npm run test:unit && npm run build` locally to verify

---

## Key environment variables

| Var | Where |
|-----|-------|
| `VITE_SUPABASE_URL` | `.env` (local) + Vercel |
| `VITE_SUPABASE_ANON_KEY` | `.env` (local) + Vercel |
| `BREVO_API_KEY` | Supabase Edge Function secrets |

---

## What's done ✅

- Phase 2: 86 unit tests + 7 Storybook stories
- Lot 6: Automations (email/SMS via Brevo)
- Phase 3 Lot A: Toast + SettingsPage + React.lazy code splitting
- Phase 3 Lot B: Guest Portal `/check-in/:token`
- Phase 3 Lot C: PWA + 3-step Onboarding modal
- Phase 3 Lot D: Dashboard live (Supabase realtime) + Skeleton + ErrorBoundary
- CI/CD: GitHub Actions green ✅

## What's next (ideas)

- Stripe billing integration
- Multi-language support (en / ar)
- Mobile app (Capacitor or React Native)
- Advanced analytics dashboard
- Airbnb/Booking.com calendar sync (iCal)
