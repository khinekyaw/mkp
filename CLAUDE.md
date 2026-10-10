@AGENTS.md

# Project notes

- Plan/roadmap: `docs/platform-plan.md`. Setup and architecture: `README.md` ("The platform").
- Local DB is PGlite (`.data/pglite`, single process): stop `pnpm dev` before `pnpm db:*`. Set `DATABASE_URL` for real Postgres.
- Schema changes: edit `lib/db/schema.ts` → `pnpm db:generate` → `pnpm db:migrate`.
- Tenancy rule: dashboard code calls `requireBusiness(slug, role)` and every query/mutation filters by `businessId`.
- Bookings are only created through `createBooking` (`lib/bookings/service.ts`), which re-checks availability under a provider row lock.
- `lib/scheduling` is pure; keep it I/O-free and covered by `pnpm test`.
- UI primitives read CSS variables; re-theme with `ThemeScope`, don't hardcode brand colors.
- Visual system: `DESIGN.md`, product truth: `PRODUCT.md`. App tokens (`--canvas`, `--ink-pill`, `--sage-*`, `--tone-*`) are for our own surfaces only, never inside the clinic-branded widget.
- All our UI copy (landing, auth, onboarding, studio, dashboard incl. Server Action messages, super-admin) lives in `lib/site-copy.ts` / `lib/copy/dashboard.ts` / `lib/copy/admin.ts` in English and Myanmar; never hardcode user-facing strings or repeat a line in both languages. Format dates with `lib/format.ts` and pass `locale` (never `Intl` for Burmese); patient-facing text uses `patientDate` / `patientTime`. Patient copy is `lib/i18n.ts`.
- Emails and other side effects are queued (`enqueue` in `lib/jobs/queue.ts`, then `after(kickJobs)`), never sent inline. Record changes to bookings, the team and clinics with `audit()` (`lib/audit.ts`).
- Public pages and the public API load clinics through `getPublicBusiness` / `findPublicBusinessRow` so suspended, deleted and maintenance states are respected.
- Super-admin code lives in `lib/admin` and `app/admin`; every action goes through `requireAdminAction()` and records a reason. Never import a `"use server"` file for reads: put queries in a non-action module.
- Inside raw `sql` subqueries, reference the outer table by name (e.g. `business.id`); a drizzle column renders unqualified and binds to the inner table.
- Local dev accounts and the emailed-link workflow without Resend: README, "Accounts in development".
