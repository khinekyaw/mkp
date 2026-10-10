# Booking Widget — Platform Plan

Oct 9, 2026 · evolves the demo into a multi-tenant SaaS for clinics (Myanmar first).

## Product shape

Three surfaces, one codebase:

| Surface | Who | What |
| --- | --- | --- |
| **Dashboard** `/dashboard/[biz]` | Clinic owner, admins, front desk | Calendar, appointments, services, doctors & schedules, customers, appearance (AI theming), share/embed, settings |
| **Booking** `/b/[slug]`, `/embed/[businessId]`, `embed.js` | Patients | Hosted booking page (works as a Facebook/Viber link), embeddable widget, self-service manage/cancel |
| **Marketing** `/` | Prospects | Landing page with the live "paste your site" theming demo → sign up |

Hosted booking pages matter as much as the embed: many Myanmar clinics live on Facebook, not a website.

## Architecture

- **Next.js 16 App Router**, React 19, TypeScript, Tailwind v4. Server Components for reads, Server Actions for dashboard mutations, route handlers for the public API (consumed by the widget).
- **Postgres + Drizzle ORM.** `DATABASE_URL` set → `postgres-js` (Neon, Supabase, RDS…). Unset → **PGlite** (embedded Postgres in `.data/pglite`) so local dev needs zero setup. Same schema and SQL migrations either way.
- **Better Auth** (self-hosted, Drizzle adapter): email + password now; Google/Facebook OAuth and magic links later. No per-seat auth vendor cost.
- **Multi-tenancy:** every domain row has `business_id`; all dashboard data access goes through `requireBusiness(slug)` which checks membership + role. Public API resolves businesses by immutable id/slug and only exposes public fields.
- **Scheduling engine** (`lib/scheduling`) is pure and unit-tested: weekly intervals per provider (fallback to business hours), time off, existing bookings, service duration + buffer, lead time, booking horizon, slot interval, all in the business timezone.
- **Double-booking prevention:** booking inserts run in a transaction that locks the provider row (`SELECT … FOR UPDATE`) and re-checks overlaps.
- **Notifications** behind a `Mailer` interface: console in dev, Resend when `RESEND_API_KEY` is set. SMS/Viber get the same interface later.
- **AI theming** stays as built (signals → xAI Grok structured output → contrast-safe palette), now saved per business.
- **Rate limiting** on public writes and theme detection (in-memory now; Redis/Upstash adapter later).

## Data model

```
user, session, account, verification     ← Better Auth
business (id, slug, name, timezone, default_locale, contact, theme jsonb, settings jsonb, status: active | suspended)
membership (business_id, user_id, role: owner | admin | staff)
service (business_id, name, name_my, description, duration_min, buffer_min, price, currency, active, sort)
provider (business_id, name, title, bio, user_id?, active, sort)        ← doctors / staff
provider_service (provider_id, service_id)
schedule (business_id, provider_id?, weekday, start_min, end_min)       ← provider_id null = business hours
time_off (business_id, provider_id?, starts_at, ends_at, reason)        ← provider_id null = clinic closed
customer (business_id, name, phone, email, notes)                       ← unique per business+phone
booking (business_id, service_id, provider_id, customer_id, starts_at, ends_at, status,
         customer snapshot, note, locale, source, manage_token, cancelled_at, cancel_reason)
```

Settings (jsonb): `leadMinutes`, `horizonDays`, `slotIntervalMin`, `requireConfirmation`, `cancelNoticeHours`, `locales`.

## Phases

### Phase 1 — Platform foundation ✅ (built Oct 9, 2026)
- [x] Plan
- [x] Database, migrations, seed data (demo clinic)
- [x] Auth: sign up, sign in, sign out, password reset (email via mailer)
- [x] Onboarding: create business → detect brand from website → starter services & hours
- [x] Services, doctors (with per-doctor schedules & services), business hours, time off
- [x] Availability engine + tests; "any available doctor" assignment
- [x] Public API, hosted booking page, iframe embed by business id, updated `embed.js`
- [x] Patient self-service: manage link, cancel within notice window
- [x] Dashboard: overview, calendar (day view by doctor + list), manual phone bookings, status changes (confirm / complete / no-show / cancel), customers
- [x] Appearance studio saving per-business themes; share page with link, embed code, QR code
- [x] Email notifications (patient confirmation/cancellation, clinic new-booking alert)
- [x] Landing page with live theming demo

### Launch readiness (before public launch)

Built Oct 10, 2026 unless marked otherwise. "Needs input" items are blocked on an account, key or decision.

Security
- [x] Security headers and an allowlist CSP (`next.config.ts`): only `/embed/*` may be framed; scripts, styles, fonts, frames and connections limited to us, Google Fonts and Cloudflare Turnstile
- [x] Email verification before an account gets a session; sessions revoked on password reset
- [x] `business.status` (active | suspended) and platform maintenance mode: booking page and embed show a "not taking online bookings" notice with the clinic's phone; public API 404s; dashboard keeps working
- [x] Shared rate limits in Postgres (`throttle` table) for the public API and theme detection; client IP only from a trusted header (`TRUSTED_IP_HEADER`, `x-real-ip` on Vercel, else right-most `x-forwarded-for`)
- [x] Better Auth limiter on the database (`rate_limit` table) with tighter rules for sign-in, sign-up, reset and 2FA
- [x] `/api/theme`: per-site cache (7 days), daily AI budget (`THEME_AI_DAILY_LIMIT`, heuristics after), 30/10 min for signed-in users, 5/10 min anonymous
- [x] Booking spam: max 3 upcoming online bookings per phone per clinic, per-clinic hourly cap, per-IP cap, honeypot; Cloudflare Turnstile wired in (needs input: keys)
- [x] SSRF: DNS pinned in the socket's own lookup (undici), `BlockList` covering private, CGNAT, link-local, NAT64, 6to4, Teredo and mapped addresses
- [x] Two-step verification (TOTP + backup codes) for everyone; required for platform admins in production
- [x] Terms and Privacy Policy pages (needs input: legal review, entity name, contact), consent line on the booking form (`booking.consent_at`), sign-up agreement line
- [x] Clinic data export (JSON, owners) and clinic deletion with a 30-day grace period, purged by the daily job
- [x] Audit log (`audit_event`): bookings, team, data and every admin action; clinic Activity page
- [ ] Backups with point-in-time restore (needs input: Neon plan/branching settings)
- [ ] Nonce- or SRI-based script CSP (today: origin allowlist with `'unsafe-inline'`; nonces would make every page dynamic)

Performance & operations
- [x] `vercel.json`: functions in Singapore (`sin1`); crons for jobs (every 5 min) and daily maintenance (needs input: Postgres region, Vercel plan)
- [x] Pool size per instance (`DATABASE_POOL_MAX`, 3 on Vercel); point `DATABASE_URL` at a pooler
- [x] `pg_trgm` GIN indexes for customer and appointment search
- [x] Jobs queue (`job` table): emails retried with backoff, reminders, daily maintenance; `/api/cron/[task]` behind `CRON_SECRET`; admin view with retry
- [x] Fonts self-hosted and subset by `next/font` (Archivo, Noto Sans Myanmar); `embed.js` cached for an hour
- [x] Error reporting: JSON error lines via `instrumentation.ts` plus optional `ERROR_WEBHOOK_URL`; `/api/health` for uptime monitors (needs input: monitor, optional Sentry)
- [x] CI (`.github/workflows/ci.yml`): typecheck (with route typegen), lint, test, migrate, build
- [ ] Cache public business/services/schedules with `use cache` (needs `cacheComponents`, which changes rendering app-wide; do after launch with measurements)
- [ ] Measure the booking page on throttled 3G; slow-query logging (Neon's query insights)

Product
- [x] Friendly "not taking online bookings" page instead of a 404 (also inside iframes)
- [x] Reminders: email 24 h before (or 2 h for same-day bookings), rescheduled with the appointment, dropped on cancel
- [ ] SMS/Viber reminders (needs input: provider and sender ID)
- [x] Team invites with roles (owner/admin/staff), revoke, remove, change role; last owner protected
- [x] Reschedule: patients from the manage link (within the cancel window), staff from the booking dialog
- [x] Calendar week view (already built)
- [x] Account settings: name, email change (verified), password, 2FA, sign out other devices, delete account (blocked while sole owner)
- [x] Facebook "Book now" guide on Share & embed; Zawgyi → Unicode for patient names and notes (Google's `myanmar-tools`)
- [x] In-app support link (`NEXT_PUBLIC_SUPPORT_URL`, needs input)

Super-admin (`/admin`)
- [x] Better Auth `admin` plugin; 404 for non-admins; 2FA required in production; `pnpm admin:grant <email>` bootstraps the first admin
- [x] Every admin action audited with a reason; support sessions ("Sign in as owner", 1 hour) show a banner and appear in the clinic's activity
- [x] Overview: clinics, active clinics, sign-ups, bookings, online share, no-show rate, jobs, AI calls, activation funnel
- [x] Clinics: search, suspend/restore, plan and trial end, record payments, make owner, change link, support session, delete/undelete
- [x] Users: mark verified, send reset, ban/unban, sign out everywhere, grant/revoke platform admin
- [x] Billing (manual): trial / paid until / overdue per clinic
- [x] Jobs (failed + waiting, retry, run now), audit log, platform settings (announcement banner EN/MY, maintenance mode)
- [x] Aggregates by default; patient details only inside a logged support session
- [ ] Feature flags per clinic and an abuse view (wait until there's something to flag)

### Phase 2 — Retention & operations (next)
- Week view in the calendar; drag to reschedule
- Reminders (SMS/Viber/email) on a schedule (cron / queue), no-show reduction
- Reschedule flow, waitlist
- Team invites with roles (memberships + role checks exist; add the invite flow); staff see only their own calendar
- Intake forms per service (custom fields), patient notes history
- Analytics: bookings by source, no-show rate, utilization
- Zawgyi ↔ Unicode detection/conversion for patient-entered text
- Facebook Page integration ("Book now" button + Messenger confirmations)

### Phase 3 — Monetization & scale
- Subscription billing for clinics (2C2P aggregator first; KBZPay/Wave once a local entity exists)
- Optional deposits / prepayment for appointments
- Multi-location businesses, resources (rooms/equipment)
- Custom domains for hosted booking pages
- Google Calendar two-way sync, public REST API + webhooks
- Expansion: more SEA languages, per-country payment rails

## Deployment

Vercel (or any Node host) + Neon Postgres + Resend. Env: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `XAI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`.

## Open questions
- SMS/Viber provider for Myanmar (cost per message, sender ID registration)
- Pricing (per clinic vs per doctor), free tier limits
- Data residency expectations for patient data
