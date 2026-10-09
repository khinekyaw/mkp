import type { Metadata } from "next";
import { CalendarDay } from "@/components/dashboard/calendar-day";
import { NewBookingDialog } from "@/components/dashboard/new-booking-dialog";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { getBusinessHours, listBookingsBetween, listProviders, listServices, listTimeOff } from "@/lib/dashboard/queries";
import { fmtLocalDate } from "@/lib/format";
import { addDays, dateInZone, dayRangeUtc, isDateString, minutesInZone, weekday } from "@/lib/scheduling/time";
import { CalendarToolbar } from "./toolbar";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({ params, searchParams }: PageProps<"/dashboard/[biz]/calendar">) {
  const [{ biz }, query] = await Promise.all([params, searchParams]);
  const { business } = await requireBusiness(biz);
  const tz = business.timezone;
  const today = dateInZone(new Date(), tz);
  const date = isDateString(query.date) ? query.date : today;
  const day = dayRangeUtc(date, tz);

  const [providers, services, bookings, hours, absences] = await Promise.all([
    listProviders(business.id),
    listServices(business.id),
    listBookingsBetween(business.id, day.start, day.end),
    getBusinessHours(business.id),
    listTimeOff(business.id, { upcomingOnly: false }),
  ]);
  const wd = weekday(date);
  const active = providers.filter((p) => p.active || bookings.some((b) => b.providerId === p.id));
  // Clip absences to this day, in local minutes.
  const toLocal = (d: Date) => (d <= day.start ? 0 : d >= day.end ? 1440 : minutesInZone(d, tz));
  const dayAbsences = absences
    .filter((a) => a.startsAt < day.end && a.endsAt > day.start)
    .map((a) => ({ providerId: a.providerId, startMin: toLocal(a.startsAt), endMin: toLocal(a.endsAt), reason: a.reason }));

  const columns = active.map((p) => {
    const weekly = (p.useBusinessHours ? hours : p.schedule).filter((s) => s.weekday === wd);
    return {
      id: p.id,
      name: p.name,
      title: p.title,
      working: weekly.map((s) => ({ startMin: s.startMin, endMin: s.endMin })),
      absences: dayAbsences.filter((a) => a.providerId === p.id || a.providerId === null),
    };
  });

  // Visible range: union of working hours and bookings, padded, defaulting to 8–18.
  const mins = [
    ...columns.flatMap((c) => c.working.flatMap((w) => [w.startMin, w.endMin])),
    ...bookings.flatMap((b) => [minutesInZone(b.startsAt, tz), minutesInZone(b.endsAt, tz) || 1440]),
  ];
  const gridStart = Math.max(0, Math.floor((mins.length ? Math.min(...mins) : 8 * 60) / 60) * 60 - 60);
  const gridEnd = Math.min(1440, Math.ceil((mins.length ? Math.max(...mins) : 18 * 60) / 60) * 60 + 60);

  return (
    <>
      <PageHeader
        title="Calendar"
        description={fmtLocalDate(date)}
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
      <CalendarToolbar date={date} today={today} prev={addDays(date, -1)} next={addDays(date, 1)} />
      <CalendarDay
        slug={business.slug}
        timezone={tz}
        isToday={date === today}
        gridStart={gridStart}
        gridEnd={gridEnd}
        columns={columns}
        bookings={bookings.map((b) => ({
          ...b,
          startMin: minutesInZone(b.startsAt, tz),
          endMin: minutesInZone(b.endsAt, tz) || 1440,
        }))}
      />
    </>
  );
}
