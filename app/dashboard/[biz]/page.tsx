import {
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock3,
  Hourglass,
  MapPin,
  Plus,
  QrCode,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/dashboard/avatar";
import { CopyLink } from "@/components/dashboard/copy-link";
import { NewBookingDialog } from "@/components/dashboard/new-booking-dialog";
import { TodayAppointments } from "@/components/dashboard/today-appointments";
import { canManage, requireBusiness } from "@/lib/business/access";
import { getBusinessHours, getOverview, listProviders, listServices } from "@/lib/dashboard/queries";
import type { BookingStatus } from "@/lib/db/schema";
import type { DashCopy } from "@/lib/copy/dashboard";
import { fmtClock, fmtLocalDate, formatHours } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { getSiteCopy } from "@/lib/site-locale";
import { minutesInZone, weekday } from "@/lib/scheduling/time";
import { appUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.today };
}

export default async function OverviewPage({ params, searchParams }: PageProps<"/dashboard/[biz]">) {
  const [{ biz }, query] = await Promise.all([params, searchParams]);
  const [{ business, role, user }, { locale, t }] = await Promise.all([requireBusiness(biz), getSiteCopy()]);
  const d = t.dash;
  const o = d.overview;
  const [overview, services, providers, hours] = await Promise.all([
    getOverview(business),
    listServices(business.id),
    listProviders(business.id),
    getBusinessHours(business.id),
  ]);
  const base = `/dashboard/${business.slug}`;
  const manager = canManage(role);
  const wd = weekday(overview.today);
  const activeServices = services.filter((s) => s.active && s.providerIds.length);

  // Today's bookings by stage. Cancelled ones stay out of every count.
  const today = overview.todayBookings.filter((b) => b.status !== "cancelled");
  const byStatus = (s: BookingStatus) => today.filter((b) => b.status === s).length;
  const done = byStatus("completed") + byStatus("no_show");
  const confirmed = byStatus("confirmed");
  const pendingToday = byStatus("pending");
  const pct = (n: number) => (today.length ? Math.round((n / today.length) * 100) : 0);

  // Each doctor's day: on duty when they have hours (or bookings) today.
  const doctors = providers
    .filter((p) => p.active || today.some((b) => b.providerId === p.id))
    .map((p) => ({
      ...p,
      hoursToday: formatHours((p.useBusinessHours ? hours : p.schedule).filter((s) => s.weekday === wd)),
      count: today.filter((b) => b.providerId === p.id).length,
    }));
  const onDuty = doctors.filter((d) => d.hoursToday || d.count).length;

  // Clinic hours today, and how far through them we are.
  const open = hours.filter((h) => h.weekday === wd);
  const opensAt = open.length ? Math.min(...open.map((h) => h.startMin)) : null;
  const closesAt = open.length ? Math.max(...open.map((h) => h.endMin)) : null;
  const now = minutesInZone(new Date(), business.timezone);

  const checklist = [
    { done: overview.totals.services > 0, label: o.checklist.services, href: `${base}/services` },
    { done: overview.totals.providers > 1 || providers.some((p) => p.title), label: o.checklist.staff, href: `${base}/staff` },
    { done: !!business.theme, label: o.checklist.brand, href: `${base}/appearance` },
    { done: overview.totals.bookings > 0, label: o.checklist.share, href: `${base}/share` },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1.5">
          <h1 className="text-[2.5rem] leading-tight font-medium tracking-[-0.03em] sm:text-5xl">{o.title}</h1>
          <p className="text-sm text-muted-foreground">
            {query.welcome
              ? o.welcome(user.name.split(" ")[0])
              : o.subtitle}
          </p>
        </div>
        <div className="grid gap-0.5 text-sm sm:justify-items-end">
          <p className="flex items-center gap-1.5 font-medium">
            <MapPin className="size-4 text-muted-foreground" /> {business.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {fmtLocalDate(overview.today, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, locale)}
          </p>
        </div>
      </div>

      {manager && checklist.some((c) => !c.done) ? (
        <Panel className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium tracking-tight">{o.gettingStarted}</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {o.doneOf(checklist.filter((c) => c.done).length, checklist.length)}
            </span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex h-full items-center gap-3 rounded-2xl bg-muted p-3 text-sm transition-colors hover:bg-border">
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full",
                      c.done ? "bg-primary text-primary-foreground" : "bg-background ring-1 ring-border ring-inset",
                    )}
                  >
                    {c.done ? <Check className="size-3.5" /> : null}
                  </span>
                  <span className={c.done ? "text-muted-foreground line-through" : ""}>{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
        {/* Today's progress */}
        <Panel className="grid content-start gap-6 md:col-span-2 xl:col-span-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-medium tracking-tight">{o.progress}</h2>
            <Link href={`${base}/calendar`} className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs ring-1 ring-border transition-colors ring-inset hover:bg-muted">
              {o.openCalendar} <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{o.seenTitle}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {today.length ? o.ofTotal(done, today.length) : o.noneYet}
              </span>
            </div>
            <ProgressBar
              segments={[
                { value: pct(done), className: "bg-sage-deep", icon: <Check />, label: o.seen },
                { value: pct(confirmed), className: "bg-primary", icon: <CalendarCheck />, label: o.confirmed },
              ]}
            />
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
              <Legend swatch="bg-sage-deep" label={`${o.seen} ${done}`} />
              <Legend swatch="bg-primary" label={`${o.confirmed} ${confirmed}`} />
              <Legend swatch="hatch bg-background ring-1 ring-border ring-inset" label={`${o.pending} ${pendingToday}`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile icon={<CalendarDays />} label={o.tiles.today} value={today.length} ratio={today.length ? done / today.length : undefined} href={`${base}/calendar`} />
            <Tile
              icon={<Hourglass />}
              label={o.tiles.awaiting}
              value={overview.pendingCount}
              tone={overview.pendingCount ? "amber" : undefined}
              href={`${base}/appointments?filter=pending`}
            />
            <Tile
              icon={<Stethoscope />}
              label={o.tiles.onDuty}
              value={
                <>
                  {onDuty} <span className="text-muted-foreground">/ {doctors.length}</span>
                </>
              }
              ratio={doctors.length ? onDuty / doctors.length : undefined}
              href={manager ? `${base}/staff` : `${base}/calendar`}
            />
            <Tile icon={<UserPlus />} label={o.tiles.newPatients} value={overview.newCustomers} href={`${base}/customers`} />
          </div>
        </Panel>

        {/* Doctors */}
        <Panel className="flex flex-col gap-2 xl:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-medium">{o.doctors}</h2>
            <RoundLink href={manager ? `${base}/staff` : `${base}/calendar`} label={manager ? o.manageStaff : o.openCalendar} />
          </div>
          {doctors.length ? (
            <ul className="-mb-2 max-h-80 divide-y overflow-y-auto [scrollbar-width:thin]">
              {doctors.map((doc) => {
                const working = !!(doc.hoursToday || doc.count);
                return (
                  <li key={doc.id} className="flex items-center gap-2.5 py-2.5">
                    <Avatar name={doc.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{doc.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground tabular-nums">{doc.hoursToday ?? doc.title ?? o.noHours}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        working ? "bg-tone-blue-soft text-tone-blue" : "bg-tone-red-soft text-tone-red",
                      )}
                    >
                      <span aria-hidden className={cn("size-1.5 rounded-full", working ? "bg-tone-blue" : "bg-tone-red")} />
                      {working ? o.onDuty : o.offToday}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">{o.noDoctors}</p>
          )}
        </Panel>

        {/* Today's appointments */}
        <Panel className="flex flex-col gap-2 xl:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-medium">
              {o.appointments}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground tabular-nums">{today.length}</span>
            </h2>
            <NewBookingDialog
              slug={business.slug}
              timezone={business.timezone}
              services={activeServices}
              providers={providers.filter((p) => p.active)}
              defaultDate={overview.today}
              trigger={
                <button type="button" className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors hover:bg-muted">
                  <Plus className="size-3.5" /> {o.addNew}
                </button>
              }
            />
          </div>
          {today.length ? (
            <div className="-mb-2 max-h-80 overflow-y-auto pr-1 [scrollbar-width:thin]">
              <TodayAppointments bookings={today} slug={business.slug} timezone={business.timezone} />
            </div>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">{o.noAppointments}</p>
          )}
        </Panel>

        {/* Week load + clinic hours */}
        <div className="grid content-start gap-4 xl:col-span-3">
          <WeekLoad days={overview.weekByDay} total={overview.weekCount} href={`${base}/appointments`} d={d} locale={locale} />
          <Panel className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-medium">{o.clinicHours}</h2>
              <span className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs text-muted-foreground ring-1 ring-border ring-inset">
                <CalendarDays className="size-3.5" /> {o.today}
              </span>
            </div>
            <ClinicHours opensAt={opensAt} closesAt={closesAt} now={now} intervals={formatHours(open)} o={o} locale={locale} />
          </Panel>
        </div>

        {/* Today's flow */}
        <Panel className="grid gap-4 md:order-last md:col-span-2 sm:grid-cols-2 xl:order-none xl:col-span-6">
          <div className="flex flex-col justify-between gap-6">
            <div className="grid gap-1">
              <h2 className="text-lg font-medium tracking-tight">{o.flow}</h2>
              <p className="text-sm text-muted-foreground">{o.flowBody}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FlowTile icon={<Check />} label={o.seen} value={done} note={byStatus("no_show") ? o.noShows(byStatus("no_show")) : o.patients} />
              <FlowTile icon={<Clock3 />} label={o.stillToCome} value={confirmed + pendingToday} note={pendingToday ? o.pendingN(pendingToday) : o.patients} />
            </div>
          </div>
          <StatusDonut
            counts={(["completed", "confirmed", "pending", "no_show"] as const).map((s) => ({ status: s, n: byStatus(s) }))}
            cancelled={overview.todayBookings.length - today.length}
            d={d}
          />
        </Panel>

        {/* Booking link */}
        <section
          className="sage-glow relative flex min-h-72 flex-col justify-between gap-6 overflow-hidden rounded-[1.25rem] p-5 text-white xl:col-span-3"
        >
          <div className="grid gap-1">
            <h2 className="text-lg font-medium tracking-tight">{o.bookingPage}</h2>
            <p className="text-sm text-white/80">{o.bookingPageBody}</p>
          </div>
          <div className="grid gap-2">
            {manager ? (
              <div className="flex flex-wrap gap-1.5">
                <Link href={`${base}/share`} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] backdrop-blur-sm transition-colors hover:bg-white/25">
                  <QrCode className="size-3" /> {o.qr}
                </Link>
                <Link href={`${base}/share`} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] backdrop-blur-sm transition-colors hover:bg-white/25">
                  {o.embed}
                </Link>
              </div>
            ) : null}
            <div className="rounded-2xl bg-background/95 p-3 text-foreground">
              <CopyLink value={appUrl(`/b/${business.slug}`)} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-[1.25rem] bg-background p-5", className)}>{children}</section>;
}

function RoundLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} title={label} className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
      <ArrowUpRight className="size-4" />
    </Link>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span aria-hidden className={cn("size-2.5 rounded-full", swatch)} />
      {label}
    </span>
  );
}

/** Stacked bar with a marker at each segment's end; the rest is hatched. */
function ProgressBar({ segments }: { segments: { value: number; className: string; icon: ReactNode; label: string }[] }) {
  const marks = segments.map((s, i) => ({ ...s, at: segments.slice(0, i + 1).reduce((a, x) => a + x.value, 0) }));
  const shown = marks.filter((m) => m.value > 0 && m.at < 100);
  return (
    <div className="grid gap-1.5">
      <div className="relative pt-7">
        {shown.map((m) => (
            <span key={m.label} className="absolute top-0 bottom-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${m.at}%` }}>
              <span className="grid size-5 place-items-center rounded-full bg-background text-foreground ring-1 ring-border [&_svg]:size-3">{m.icon}</span>
              <span className="w-px flex-1 bg-foreground/70" />
            </span>
          ))}
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}%`).join(", ")}>
          {segments.map((s) => (s.value ? <div key={s.label} className={s.className} style={{ width: `${s.value}%` }} /> : null))}
          <div className="hatch flex-1" />
        </div>
      </div>
      <div className="relative h-4 text-[11px] text-muted-foreground tabular-nums">
        {/* A marker's label replaces the end label it would collide with. */}
        {shown.some((m) => m.at < 14) ? null : <span className="absolute left-0">0%</span>}
        {shown.map((m) => (
          <span key={m.label} className="absolute -translate-x-1/2" style={{ left: `${Math.min(95, Math.max(5, m.at))}%` }}>
            {m.at}%
          </span>
        ))}
        {shown.some((m) => m.at > 86) ? null : <span className="absolute right-0">100%</span>}
      </div>
    </div>
  );
}

function Tile({
  icon,
  label,
  value,
  ratio,
  tone,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  ratio?: number;
  tone?: "amber";
  href: string;
}) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <Link href={href} className="grid content-start justify-items-center gap-2 rounded-2xl bg-muted px-3 py-4 text-center transition-colors hover:bg-border">
      <span className="relative grid size-12 place-items-center">
        <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="24" cy="24" r={r} fill="none" strokeWidth="2" className={tone === "amber" ? "stroke-tone-amber" : "stroke-border"} />
          {ratio !== undefined && ratio > 0 ? (
            <circle cx="24" cy="24" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${c * Math.min(1, ratio)} ${c}`} className="stroke-primary" />
          ) : null}
        </svg>
        <span className={cn("[&_svg]:size-[18px]", tone === "amber" ? "text-tone-amber" : "text-foreground")}>{icon}</span>
      </span>
      <span className="text-xs leading-snug font-medium">{label}</span>
      <span className="text-lg leading-none font-medium tabular-nums">{value}</span>
    </Link>
  );
}

function WeekLoad({ days, total, href, d, locale }: { days: { date: string; n: number }[]; total: number; href: string; d: DashCopy; locale: Locale }) {
  const peak = Math.max(1, ...days.map((x) => x.n));
  return (
    <Link href={href} className="grid gap-3 rounded-[1.25rem] bg-background p-5 transition-colors hover:bg-background/80">
      <div className="flex items-start justify-between gap-3">
        <p className="text-5xl leading-none font-medium tracking-tight tabular-nums">{total}</p>
        <div className="grid gap-1 text-[11px] text-muted-foreground">
          <Legend swatch="bg-primary" label={d.overview.legendToday} />
          <Legend swatch="bg-sage-soft" label={d.overview.legendComing} />
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="max-w-[10rem] text-sm leading-snug font-medium">{d.overview.week}</p>
        <div className="flex h-14 items-end gap-1" role="img" aria-label={days.map((x) => `${fmtLocalDate(x.date, { weekday: "short" }, locale)} ${x.n}`).join(", ")}>
          {days.map((day, i) => (
            <span key={day.date} className="grid justify-items-center gap-1">
              <span
                className={cn("w-2.5 rounded-full", i === 0 ? "bg-primary" : "bg-sage-soft")}
                style={{ height: `${Math.max(4, (day.n / peak) * 40)}px` }}
              />
              <span className="text-[9px] leading-none text-muted-foreground">{d.weekdaysNarrow[new Date(`${day.date}T00:00:00Z`).getUTCDay()]}</span>
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function ClinicHours({
  opensAt,
  closesAt,
  now,
  intervals,
  o,
  locale,
}: {
  opensAt: number | null;
  closesAt: number | null;
  now: number;
  intervals: string | null;
  o: DashCopy["overview"];
  locale: Locale;
}) {
  if (opensAt === null || closesAt === null) {
    return <p className="text-sm text-muted-foreground">{o.closedToday}</p>;
  }
  const progress = Math.round(Math.min(1, Math.max(0, (now - opensAt) / (closesAt - opensAt))) * 100);
  const left = closesAt - now;
  const status = now < opensAt ? o.opensAt(fmtClock(opensAt, locale)) : now >= closesAt ? o.closedForDay : o.remaining(Math.floor(left / 60), left % 60);
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-medium">{now >= opensAt && now < closesAt ? o.openNow : o.today}</span>
        <span className="text-muted-foreground tabular-nums">{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[11px] text-muted-foreground tabular-nums">
        <span>{intervals}</span>
        <span>{status}</span>
      </div>
    </div>
  );
}

function FlowTile({ icon, label, value, note }: { icon: ReactNode; label: string; value: number; note: string }) {
  return (
    <div className="grid gap-3 rounded-2xl bg-muted p-3.5">
      <span className="grid size-8 place-items-center rounded-full bg-background ring-1 ring-border [&_svg]:size-4">{icon}</span>
      <div className="grid gap-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl leading-tight font-medium tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

const STROKE: Record<string, string> = {
  completed: "stroke-sage-deep",
  confirmed: "stroke-primary",
  pending: "stroke-tone-yellow",
  no_show: "stroke-tone-red",
};
const SWATCH: Record<string, string> = {
  completed: "bg-sage-deep",
  confirmed: "bg-primary",
  pending: "bg-tone-yellow",
  no_show: "bg-tone-red",
};

/** Today's appointments by status, as a donut with a total in the middle. */
function StatusDonut({ counts, cancelled, d }: { counts: { status: BookingStatus; n: number }[]; cancelled: number; d: DashCopy }) {
  const total = counts.reduce((a, c) => a + c.n, 0);
  const r = 52;
  const c = 2 * Math.PI * r;
  const parts = counts.filter((x) => x.n > 0);
  const gap = parts.length > 1 ? 10 : 0;
  const arcs = parts.map((p, i) => ({
    ...p,
    len: (p.n / total) * c,
    offset: (parts.slice(0, i).reduce((a, x) => a + x.n, 0) / total) * c,
  }));
  return (
    <div className="grid gap-3 rounded-2xl bg-sage-soft/60 p-4">
      <p className="text-sm font-medium">{d.overview.byStatus}</p>
      <div className="relative mx-auto size-40">
        <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden>
          <circle cx="64" cy="64" r={r} fill="none" strokeWidth="14" className="stroke-background/70" />
          {arcs.map((a) => (
            <circle
              key={a.status}
              cx="64"
              cy="64"
              r={r}
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0.1, a.len - gap)} ${c}`}
              strokeDashoffset={-a.offset - gap / 2}
              className={STROKE[a.status]}
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="text-3xl leading-none font-medium tabular-nums">{total}</span>
          <span className="pt-1 text-[11px] text-muted-foreground">{d.overview.appointmentsN(total)}</span>
        </div>
      </div>
      <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-foreground/80">
        {counts.map((x) => (
          <li key={x.status} className="inline-flex items-center gap-1.5 tabular-nums">
            <span aria-hidden className={cn("size-2 rounded-full", SWATCH[x.status])} />
            {d.status[x.status]} {x.n}
          </li>
        ))}
        {cancelled ? <li className="text-muted-foreground tabular-nums">{d.overview.cancelledN(cancelled)}</li> : null}
      </ul>
    </div>
  );
}
