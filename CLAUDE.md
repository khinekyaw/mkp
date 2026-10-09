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
- All our UI copy (landing, auth, onboarding, studio, dashboard incl. Server Action messages) lives in `lib/site-copy.ts` / `lib/copy/dashboard.ts` in English and Myanmar; never hardcode user-facing strings or repeat a line in both languages. Format dates with `lib/format.ts` and pass `locale` (never `Intl` for Burmese). Patient copy is `lib/i18n.ts`.
