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

Security
- [x] Security headers: `frame-ancestors 'none'` everywhere except `/embed/*`, HSTS, nosniff, Referrer-Policy, Permissions-Policy (`next.config.ts`)
- [x] Email verification required before an account gets a session; fresh link on unverified sign-in; sessions revoked on password reset
- [x] `business.status` (active | suspended): booking page, embed and public API go dark (404), dashboard shows a notice
- [ ] Shared rate-limit store (Upstash Redis or a Postgres table) instead of per-instance memory; trust only the platform's client IP header
- [ ] Better Auth rate limiting on that same shared store (`rateLimit.storage`)
- [ ] `/api/theme`: global daily cap on AI calls, cache results per domain, larger allowance for signed-in users
- [ ] Booking spam: cap upcoming bookings per phone per business, cap per business per hour, Cloudflare Turnstile on the form
- [ ] SSRF: pin the checked IP when fetching (undici `Agent` with custom `lookup`); block NAT64 `64:ff9b::/96`, 6to4 `2002::/16`, hex IPv4-mapped IPv6
- [ ] 2FA for clinic owners (Better Auth `twoFactor`)
- [ ] Full Content-Security-Policy (script/style sources with nonces), after the above
- [ ] Patient data: Terms + Privacy Policy, consent line on the booking form, clinic data export/delete, audit log of booking changes, backups with point-in-time restore

Performance & operations
- [ ] Deploy functions and Postgres in Singapore (`sin1` / `ap-southeast-1`)
- [ ] Neon pooled connection string; pool size 1–3 per function
- [ ] Cache public business/services/schedules (`use cache` + tags, invalidated on dashboard saves); bookings stay live
- [ ] `pg_trgm` GIN indexes for customer and appointment search
- [ ] Jobs table + cron (or QStash/Inngest) for emails with retries; replaces fire-and-forget `after()`
- [ ] Booking page budget on throttled 3G; Burmese font subset; long-lived cache headers for `embed.js`
- [ ] Sentry, uptime checks, slow-query logging
- [ ] CI: `typecheck`, `lint`, `test` on every PR

Product
- [ ] Friendly "not taking online bookings right now" page for suspended clinics (instead of 404 inside iframes)
- [ ] SMS/Viber reminders on the jobs queue
- [ ] Team invite flow (roles already exist)
- [ ] Reschedule (patient manage link + dashboard)
- [ ] Calendar week view
- [ ] Account settings: change password, change email, delete account
- [ ] Facebook Page "Book now" setup guide; Zawgyi detection on patient input
- [ ] In-app support link (Viber/Messenger)

Super-admin (`/admin`)
- [ ] Platform role via Better Auth `admin` plugin; `requirePlatformAdmin()` guard; 2FA required
- [ ] `admin_audit` table: every admin action and impersonation, with a reason
- [ ] Overview: signups, active clinics (booked in last 7 days), bookings/day, activation funnel, email/SMS/AI spend
- [ ] Businesses: search, suspend/restore, extend trial, change plan, transfer ownership, change slug, impersonate, soft-delete
- [ ] Users: verify email, send reset, ban, revoke sessions, memberships
- [ ] Billing (manual until 2C2P): plan, `trialEndsAt`, payment records, overdue list
- [ ] Messages log, abuse signals, failed jobs, feature flags, announcement banner
- [ ] Aggregates by default; patient details only through logged impersonation

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
