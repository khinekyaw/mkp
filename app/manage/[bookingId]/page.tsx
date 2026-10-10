import { CalendarDays, Clock, MapPin, Phone, Stethoscope } from "lucide-react";
import type { Metadata } from "next";
import { ThemeScope } from "@/components/booking/theme-scope";
import { canCustomerCancel, getBookingDetails } from "@/lib/bookings/service";
import { readSettings } from "@/lib/business/settings";
import { constantTimeEqual } from "@/lib/crypto";
import { INTL_LOCALE, MESSAGES, toLocale } from "@/lib/i18n";
import { dateInZone } from "@/lib/scheduling/time";
import { DEFAULT_THEME } from "@/lib/theme";
import { CancelBooking } from "./cancel-booking";
import { RescheduleBooking } from "./reschedule-booking";

export const metadata: Metadata = { title: "Your appointment", robots: { index: false } };

export default async function ManagePage({ params, searchParams }: PageProps<"/manage/[bookingId]">) {
  const [{ bookingId }, query] = await Promise.all([params, searchParams]);
  const token = Array.isArray(query.t) ? query.t[0] : query.t;
  const lang = Array.isArray(query.lang) ? query.lang[0] : query.lang;
  const details = await getBookingDetails(bookingId);
  const valid = !!details && !!token && constantTimeEqual(token, details.booking.manageToken);

  if (!details || !valid) {
    const t = MESSAGES[toLocale(lang)];
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center text-sm text-muted-foreground">{t.notFound}</main>
    );
  }

  const { booking, business, service, provider } = details;
  const locale = toLocale(lang ?? booking.locale);
  const t = MESSAGES[locale];
  const settings = readSettings(business.settings);
  const fmtDate = new Intl.DateTimeFormat(INTL_LOCALE[locale], { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: business.timezone });
  const fmtTime = new Intl.DateTimeFormat(INTL_LOCALE[locale], { hour: "numeric", minute: "2-digit", timeZone: business.timezone });
  const theme = { ...(business.theme ?? DEFAULT_THEME), name: business.name };
  const tel = business.phone?.replace(/[^\d+]/g, "");
  const serviceName = locale === "my" && service.nameMy ? service.nameMy : service.name;

  return (
    <ThemeScope theme={theme} lang={locale} className="min-h-dvh">
      <div className="mx-auto grid max-w-md gap-6 px-4 py-10 sm:py-16">
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">{business.name}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{t.yourAppointment}</h1>
        </div>

        <div className="grid gap-4 rounded-lg border p-5">
          <span
            className={
              booking.status === "cancelled" || booking.status === "no_show"
                ? "w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                : "w-fit rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground"
            }
          >
            {t.status[booking.status]}
          </span>
          <dl className="grid gap-3 text-sm">
            <Row icon={<Stethoscope />} label={t.service}>
              {serviceName} · {provider.name}
            </Row>
            <Row icon={<CalendarDays />} label={t.date}>
              {fmtDate.format(booking.startsAt)}
            </Row>
            <Row icon={<Clock />} label={t.time}>
              {fmtTime.format(booking.startsAt)} – {fmtTime.format(booking.endsAt)}
            </Row>
            {business.address ? (
              <Row icon={<MapPin />} label="Address">
                {business.address}
              </Row>
            ) : null}
          </dl>
        </div>

        {booking.status === "pending" || booking.status === "confirmed" ? (
          canCustomerCancel(details) ? (
            <div className="grid gap-3">
              {business.status === "active" ? (
                <RescheduleBooking
                  bookingId={booking.id}
                  token={token}
                  locale={locale}
                  timezone={business.timezone}
                  today={dateInZone(new Date(), business.timezone)}
                  horizonDays={settings.horizonDays}
                  initialDate={dateInZone(booking.startsAt, business.timezone)}
                />
              ) : null}
              <CancelBooking bookingId={booking.id} token={token} locale={locale} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.cannotCancel(settings.cancelNoticeHours)}</p>
          )
        ) : null}

        <div className="flex flex-wrap gap-2">
          {business.phone ? (
            <a href={`tel:${tel}`} className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted">
              <Phone className="size-4" /> {t.call} {business.phone}
            </a>
          ) : null}
          <a href={`/b/${business.slug}?lang=${locale}`} className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium hover:bg-muted">
            {t.bookAgain}
          </a>
        </div>
      </div>
    </ThemeScope>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-muted-foreground [&_svg]:size-4" aria-hidden>
        {icon}
      </span>
      <div>
        <dt className="sr-only">{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}
