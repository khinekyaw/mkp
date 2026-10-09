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
business (id, slug, name, timezone, default_locale, contact, theme jsonb, settings jsonb)
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
