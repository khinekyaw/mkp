import type { Metadata } from "next";
import { MonthGrid, type MonthDay } from "@/components/dashboard/calendar/month-grid";
import { TimeGrid, type GridColumn } from "@/components/dashboard/calendar/time-grid";
import { NewBookingDialog } from "@/components/dashboard/new-booking-dialog";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { getBusinessHours, listBookingsBetween, listProviders, listServices, listTimeOff } from "@/lib/dashboard/queries";
import { fmtLocalDate, formatHours } from "@/lib/format";
import { CALENDAR_VIEWS, calendarRange, monthStart, type CalendarView } from "@/lib/scheduling/calendar";
import { dateInZone, dayRangeUtc, isDateString, minutesInZone, weekday } from "@/lib/scheduling/time";
import { getSiteCopy } from "@/lib/site-locale";
import { CalendarToolbar } from "./toolbar";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.calendar };
}

export default async function CalendarPage({ params, searchParams }: PageProps<"/dashboard/[biz]/calendar">) {
  const [{ biz }, query, { locale, t }] = await Promise.all([params, searchParams, getSiteCopy()]);
  const { business } = await requireBusiness(biz);
  const d = t.dash;
  const tz = business.timezone;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const today = dateInZone(new Date(), tz);
  const date = isDateString(one(query.date)) ? one(query.date)! : today;
  const view = CALENDAR_VIEWS.find((v) => v === one(query.view)) ?? "day";
  const range = calendarRange(view, date);
  const { dates } = range;
  const rangeStart = dayRangeUtc(dates[0], tz).start;
  const rangeEnd = dayRangeUtc(dates[dates.length - 1], tz).end;

  const [providers, services, allBookings, hours, absences] = await Promise.all([
    listProviders(business.id),
    listServices(business.id),
    listBookingsBetween(business.id, rangeStart, rangeEnd),
    getBusinessHours(business.id),
    listTimeOff(business.id, { upcomingOnly: false }),
  ]);
  const doctor = providers.find((p) => p.id === one(query.doctor))?.id ?? "";
  const bookings = allBookings.filter((b) => !doctor || b.providerId === doctor);
  const selected = providers.find((p) => p.id === doctor);
  const hoursOf = (p: (typeof providers)[number], wd: number) => (p.useBusinessHours ? hours : p.schedule).filter((s) => s.weekday === wd);
  const businessHoursOn = (wd: number) => hours.filter((s) => s.weekday === wd);

  // Per-date helpers in local minutes.
  const bookingsOn = (day: string) =>
    bookings
      .filter((b) => dateInZone(b.startsAt, tz) === day)
      .map((b) => ({ ...b, startMin: minutesInZone(b.startsAt, tz), endMin: minutesInZone(b.endsAt, tz) || 1440 }));
  const absencesOn = (day: string, providerId: string | null) => {
    const r = dayRangeUtc(day, tz);
    const toLocal = (x: Date) => (x <= r.start ? 0 : x >= r.end ? 1440 : minutesInZone(x, tz));
    return absences
      .filter((a) => a.startsAt < r.end && a.endsAt > r.start && (a.providerId === null || a.providerId === providerId))
      .map((a) => ({ startMin: toLocal(a.startsAt), endMin: toLocal(a.endsAt), reason: a.reason }));
  };
  const link = (v: CalendarView, day: string) => {
    const q = new URLSearchParams();
    if (v !== "day") q.set("view", v);
    if (day !== today) q.set("date", day);
    if (doctor) q.set("doctor", doctor);
    const s = q.toString();
    return `/dashboard/${business.slug}/calendar${s ? `?${s}` : ""}`;
  };

  const title =
    view === "day"
      ? fmtLocalDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, locale)
      : view === "week"
        ? `${fmtLocalDate(dates[0], { day: "numeric", month: "short" }, locale)} – ${fmtLocalDate(dates[6], { day: "numeric", month: "short", year: "numeric" }, locale)}`
        : fmtLocalDate(monthStart(date), { month: "long", year: "numeric" }, locale);

  // Day and week share the time grid; month has its own.
  let columns: GridColumn[] = [];
  if (view === "day") {
    const wd = weekday(date);
    columns = providers
      .filter((p) => (doctor ? p.id === doctor : p.active || bookings.some((b) => b.providerId === p.id)))
      .map((p) => {
        const working = hoursOf(p, wd);
        return {
          key: p.id,
          header: { kind: "doctor" as const, name: p.name, detail: formatHours(working) },
          isToday: date === today,
          working: working.map((s) => ({ startMin: s.startMin, endMin: s.endMin })),
          absences: absencesOn(date, p.id),
          bookings: bookingsOn(date).filter((b) => b.providerId === p.id),
        };
      });
  } else if (view === "week") {
    columns = dates.map((day) => {
      const wd = weekday(day);
      const working = selected ? hoursOf(selected, wd) : businessHoursOn(wd);
      return {
        key: day,
        header: { kind: "date" as const, weekday: d.weekdaysShort[wd], day: Number(day.slice(8)), href: link("day", day) },
        isToday: day === today,
        working: working.map((s) => ({ startMin: s.startMin, endMin: s.endMin })),
        absences: absencesOn(day, doctor || null),
        bookings: bookingsOn(day),
      };
    });
  }

  // Visible hours: union of working hours and bookings, padded, defaulting to 8–18.
  const mins = columns.flatMap((c) => [...c.working.flatMap((w) => [w.startMin, w.endMin]), ...c.bookings.flatMap((b) => [b.startMin, b.endMin])]);
  const gridStart = Math.max(0, Math.floor((mins.length ? Math.min(...mins) : 8 * 60) / 60) * 60 - 60);
  const gridEnd = Math.min(1440, Math.ceil((mins.length ? Math.max(...mins) : 18 * 60) / 60) * 60 + 60);

  const monthDays: MonthDay[] =
    view === "month"
      ? dates.map((day) => {
          const wd = weekday(day);
          const r = dayRangeUtc(day, tz);
          const open = (selected ? hoursOf(selected, wd) : businessHoursOn(wd)).length > 0;
          const closure = absences.some((a) => a.providerId === null && a.startsAt <= r.start && a.endsAt >= r.end);
          return {
            date: day,
            day: Number(day.slice(8)),
            inMonth: day.slice(0, 7) === date.slice(0, 7),
            isToday: day === today,
            closed: !open || closure,
            href: link("day", day),
            bookings: bookingsOn(day),
          };
        })
      : [];

  return (
    <>
      <PageHeader
        title={d.calendar.title}
        actions={
          <NewBookingDialog
            slug={business.slug}
            timezone={tz}
            services={services.filter((s) => s.active && s.providerIds.length)}
            providers={providers.filter((p) => p.active)}
            defaultDate={date}
          />
        }
      />
      <CalendarToolbar
        view={view}
        date={date}
        today={today}
        prev={range.prev}
        next={range.next}
        title={title}
        doctor={doctor}
        doctors={providers.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name }))}
      />
      {!providers.length ? (
        <p className="rounded-lg border border-dashed bg-background/60 p-10 text-center text-sm text-muted-foreground">{d.calendar.addStaff}</p>
      ) : view === "month" ? (
        <MonthGrid slug={business.slug} timezone={tz} days={monthDays} />
      ) : (
        <TimeGrid slug={business.slug} timezone={tz} gridStart={gridStart} gridEnd={gridEnd} columns={columns} showDoctor={view === "week" && !doctor} />
      )}
    </>
  );
}
