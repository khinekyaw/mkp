# AI Booking Widget - Project Plan

Oct 5, 2026 · @Daniel

## The idea

An embeddable appointment booking widget for small businesses. The core differentiator: AI automatically detects a site's existing branding (colors, fonts, style) and generates a widget that visually blends in, instead of looking like a bolted-on third-party tool. Businesses add one script tag or button and get a booking flow that matches their site or app without custom integration work.

## Demand validation

Real, documented pain exists. Calendly's own community forum has multiple threads of users explicitly asking for better brand matching beyond color — one quote: "we need visual coherence to keep our branding perfect." Calendly support confirms the limitation outright: only colors are customizable via URL parameters, not fonts or deeper CSS.

This is an industry-wide gap, not just a Calendly issue — embedded booking widgets generally feel like a bolted-on third party rather than part of the host site.

## Competitive landscape

| Competitor | What it does | Gap |
| --- | --- | --- |
| Embeddable | General-purpose AI widget builder (forms, calculators, booking); AI reads a site URL and applies brand colors to a generated widget | Not specialized for appointments or any one vertical |
| Calfrenzy | Booking widget with "brand matching" | Manual color, logo, and image selection only, not real AI detection |
| Cal.com | Developer-grade white-label scheduling, deep CSS and self-hosting control | Requires engineering effort, not a plug-and-play AI solution for non-technical small businesses |

Conclusion: no one offers a focused, truly automatic AI theming tool specifically for appointment booking that reads a site's actual design (fonts, spacing, style) rather than just letting users manually pick colors. That is the open wedge.

## Go-to-market: Myanmar beachhead

Rather than competing globally against funded players (Embeddable, Calfrenzy, Cal.com) on day one, launch first in Myanmar, where no dedicated local appointment booking platform exists today — all current salon and clinic booking apps found (Booksy, Fresha, GlossGenius, SimplyBook, etc.) have no Myanmar presence.

Unfair advantages as a Myanmar-based founder:

- Burmese language and font support, including Zawgyi compatibility
- Local payment rails (KBZPay, Wave Money) that global tools don't support
- First-hand understanding of how clinics and salons currently book (phone calls, Facebook messages) and what it would take to move them online

Niche: lead with clinics over salons. Clinics have stronger pain around no-shows and manual phone scheduling, and can justify paying for software more easily than price-sensitive salons.

Once there are real paying customers in Myanmar, the AI auto-theming feature becomes the story for expanding into other underserved Southeast Asian markets.

## Payments (deferred)

Decision: skip payment integration for the demo stage. Build and validate the core product first.

Research notes for later:

- Wave Money has an open developer API with self-serve onboarding (submit info and documents through their portal)
- KBZPay requires merchant registration to get an App ID, key, and merchant code
- Both likely require a registered local business, NRC, and Myanmar bank account for settlement, which is a blocker while based in Thailand
- Aggregators like 2C2P already bridge both KBZPay and Wave Money, potentially avoiding separate integrations
- Open question: whether a local co-founder or contact in Myanmar can handle registration and paperwork remotely

## Demo scope

Build general-purpose booking, not clinic-specific, for the first demo. The AI auto-theming concept is what's being tested, not vertical-specific features.

General booking needs: available time slots, a way to pick a slot and enter name/contact, confirmation.

Clinic-specific features (multiple doctors with separate schedules, varying appointment durations, patient intake forms, insurance handling) add complexity without being needed to prove the core idea. Use clinic-themed examples and messaging in the demo so it still resonates with the target niche, without building clinic-only logic yet.

## Next steps

- [x] Build a general-purpose booking demo with AI auto-theming, using clinic-flavored examples
- [x] Phase 1 platform: multi-tenant dashboard, doctors & schedules, hosted booking pages (see [docs/platform-plan.md](docs/platform-plan.md))
- [ ] Talk to a handful of real clinic owners (Myanmar first) to pressure-test the branding pain point before investing further
- [ ] Decide on a local anchor in Myanmar for eventual merchant/payment registration
- [ ] Revisit payment integration (KBZPay, Wave Money, or an aggregator like 2C2P) once demand is confirmed

---

## The platform

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Postgres + Drizzle · Better Auth · xAI API (Grok)

The roadmap lives in [docs/platform-plan.md](docs/platform-plan.md).

### Run it locally

```bash
pnpm install
pnpm dev            # sets up the local database on first run, then starts Next.js
```

No database install is needed: without `DATABASE_URL`, the app uses **PGlite** (embedded Postgres in `.data/pglite`). The first run seeds a demo clinic, **Golden Lotus Clinic**. Sign in at `/sign-in` with the demo account in `scripts/db.ts` (`DEMO`), or create your own account at `/sign-up`.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Migrate + seed if empty, then `next dev` |
| `pnpm test` | Unit tests (scheduling engine, phone normalization) |
| `pnpm typecheck` / `pnpm lint` | TypeScript / ESLint |
| `pnpm db:generate` | Create a SQL migration after editing `lib/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Recreate the demo clinic |
| `pnpm db:reset` | Wipe the local PGlite database and start fresh |

PGlite allows only one process at a time, so stop `pnpm dev` before running `db:*` scripts.

### Environment

Copy `.env.example` to `.env.local`. Everything is optional locally.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon, Supabase, RDS…). Unset → PGlite |
| `BETTER_AUTH_SECRET` | Session signing secret. **Required in production** (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Public base URL, e.g. `https://book.example.com` |
| `NEXT_PUBLIC_APP_URL` | Base URL for links in emails, embed snippets and QR codes |
| `XAI_API_KEY` | Enables AI brand matching with xAI Grok (falls back to heuristics without it). `XAI_MODEL` overrides the default `grok-4.20-0309-non-reasoning` |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sends real email; without them emails are printed to the server console |

### What's where

| Route | Who | |
| --- | --- | --- |
| `/` | Prospects | Landing page with the live, offline theming demo |
| `/sign-up`, `/sign-in`, `/forgot-password` | Owners | Better Auth email + password |
| `/onboarding` | Owners | Create a business (starter services, hours, a provider), then auto-theme from the website |
| `/dashboard/[biz]` | Team | Overview, calendar (day by doctor, week, month), appointments, customers, services, staff, hours & closures, appearance, share & embed, settings |
| `/b/[slug]` | Patients | Hosted booking page, a shareable link for Facebook/Viber |
| `/embed/[businessId]` + `public/embed.js` | Patients | Embeddable widget (`<script src="…/embed.js" data-business="…">`) |
| `/manage/[bookingId]?t=…` | Patients | View or cancel (within the business's notice period) |
| `/api/public/b/[businessId]/…` | Widget | Public profile, availability, create booking (rate-limited) |
| `/demo.html` | Dev | A sample clinic website embedding the seeded demo business |

```
app/                     routes (marketing, auth, onboarding, dashboard, public booking, API)
components/ui/           mono, token-driven UI kit (re-themed per business via ThemeScope)
components/booking/      the widget + its API clients (live / preview / offline demo)
components/dashboard/    calendar, dialogs, editors
components/studio/       AI theming studio (dashboard Appearance + landing page)
lib/db/                  Drizzle schema, client (Postgres or PGlite)
lib/scheduling/          pure availability engine + timezone helpers (unit-tested)
lib/bookings/            availability loading, booking creation (row-locked), public API contracts
lib/business/            tenancy (requireBusiness), settings, creation, public profile
lib/dashboard/           tenant-scoped queries and Server Actions
lib/notifications/       Mailer interface (console / Resend) + EN/MY templates
lib/theme/               site signal extraction, Grok theming (xAI), palette builder
drizzle/                 SQL migrations
scripts/db.ts            migrate / seed / reset
```

### Design system

Every surface of our own uses one look: a soft grey canvas, white rounded cards, sage-green accents, pill navigation in a floating header. The whole product (site and dashboard) is localized in English and Myanmar (`lib/site-copy.ts`, switch stored in the `site_locale` cookie). Product truth lives in [PRODUCT.md](PRODUCT.md) and the visual system with tokens in [DESIGN.md](DESIGN.md). Clinic-branded pages (widget, `/b/[slug]`, `/manage`) never use these tokens; they wear each clinic's theme.

### Key decisions

- **Tenancy.** Every domain row has `business_id`. Dashboard pages and actions go through `requireBusiness(slug, role)` (membership + role check), and every query filters by business id explicitly.
- **No double bookings.** `createBooking` re-validates the slot against the availability engine, then inside a transaction locks the provider row (`SELECT … FOR UPDATE`) and re-checks overlaps, buffers included, before inserting.
- **Scheduling.** Rules are wall-clock times in the business timezone (weekly intervals per provider or business, time off, closures, lead time, horizon, slot interval). `lib/scheduling/availability.ts` is pure and tested, including DST zones.
- **One UI kit, many brands.** Components read CSS variables; `ThemeScope` overrides them per business, which relies on Tailwind's `@theme inline`. The widget uses container queries, so it lays out by its own width inside any host page.
- **Embeds by id, themes from the server.** Changing the theme in the dashboard updates every embed instantly; slugs can change without breaking embeds.

### Deploying

Vercel (or any Node host) + Neon Postgres + Resend. Set the environment variables above, run `pnpm db:migrate` against the production database (for example as part of the build command: `pnpm db:migrate && pnpm build`), then deploy. Before real patient data: add the Phase 2 items around staff accounts/roles, reminders, and a shared rate limiter (Redis) if you run multiple instances.
