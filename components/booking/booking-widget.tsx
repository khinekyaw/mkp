"use client";

import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton, Spinner } from "@/components/ui/misc";
import type { AvailabilityResponse, BookingConfirmation } from "@/lib/bookings/public-api";
import type { PublicBusiness } from "@/lib/business/public";
import { PROVIDER_LABEL } from "@/lib/business/settings";
import { patientDate, patientDayLabels, patientLocalDate, patientTime } from "@/lib/format";
import { formatPrice, localDigits, LOCALE_LABEL, MESSAGES, type Locale } from "@/lib/i18n";
import { addDays, dateInZone } from "@/lib/scheduling/time";
import { cn } from "@/lib/utils";
import type { BookingApi } from "./api";
import { ThemeScope } from "./theme-scope";

const WINDOW_DAYS = 14;

type Step = "select" | "details" | "done";
type FieldErrors = Partial<Record<"name" | "phone" | "email" | "note", string[]>>;

export type BookingWidgetProps = {
  business: PublicBusiness;
  api: BookingApi;
  locale?: Locale;
  source?: "widget" | "page";
  className?: string;
  /** Override the business theme (studio previews). */
  theme?: PublicBusiness["theme"];
  onBooked?: (booking: BookingConfirmation) => void;
};

/** Small selectable tile used for services, providers, dates and times. */
function Choice({ selected, className, ...props }: React.ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "cursor-pointer rounded-md border bg-background text-sm transition-colors outline-none hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-border",
        selected && "border-primary bg-primary text-primary-foreground hover:border-primary",
        className,
      )}
      {...props}
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-medium text-muted-foreground">{children}</h3>;
}

export function BookingWidget({
  business,
  api,
  locale: initialLocale,
  source = "widget",
  className,
  theme,
  onBooked,
}: BookingWidgetProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale ?? business.locales[0] ?? "en");
  const t = MESSAGES[locale];
  const tz = business.timezone;
  const today = dateInZone(new Date(), tz);

  const [step, setStep] = useState<Step>("select");
  const [serviceId, setServiceId] = useState(business.services[0]?.id ?? "");
  const [providerId, setProviderId] = useState<string | null>(null);
  const [windowStart, setWindowStart] = useState(today);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, AvailabilityResponse | "error">>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);

  // Keep selections valid if the business data changes (e.g. live studio preview).
  const service = business.services.find((s) => s.id === serviceId) ?? business.services[0];
  const serviceProviders = business.providers.filter((p) => service?.providerIds.includes(p.id));
  const effectiveProvider = providerId && service?.providerIds.includes(providerId) ? providerId : null;
  const showProviderChoice = business.allowProviderChoice && serviceProviders.length > 1;

  const keyFor = (from: string) => `${service?.id}|${effectiveProvider ?? "any"}|${from}|${reloadKey}`;
  const key = keyFor(windowStart);
  const entry = cache[key];
  const data = entry && entry !== "error" ? entry : null;
  const horizonEnd = addDays(today, business.horizonDays);
  const nextStart = addDays(windowStart, WINDOW_DAYS);
  const canGoBack = windowStart > today;
  const canGoForward = nextStart < horizonEnd;

  // Each key is fetched once; results are stored by key, so late responses are harmless.
  // Once a window loads, the next one is prefetched so "Later dates" swaps in without
  // a skeleton (and the layout shift that comes with it).
  const requested = useRef(new Set<string>());
  const currentServiceId = service?.id;
  const loaded = entry !== undefined;
  const nextKey = canGoForward ? keyFor(nextStart) : null;
  useEffect(() => {
    if (!currentServiceId) return;
    const load = (k: string, from: string) => {
      if (requested.current.has(k)) return;
      requested.current.add(k);
      api
        .availability({ serviceId: currentServiceId, providerId: effectiveProvider, from, days: WINDOW_DAYS })
        .then((res) => setCache((c) => ({ ...c, [k]: res })))
        .catch(() => setCache((c) => ({ ...c, [k]: "error" })));
    };
    load(key, windowStart);
    if (loaded && nextKey) load(nextKey, nextStart);
  }, [api, key, currentServiceId, effectiveProvider, windowStart, loaded, nextKey, nextStart]);

  const time = (at: string) => patientTime(at, tz, locale);
  // Burmese chips spell out the weekday and month ("ကြာသပတေး", "အောက်တိုဘာ").
  const chipWidth = locale === "my" ? "w-20" : "w-14";
  // A glyph in the chip's script, so skeleton lines get the same height (Myanmar lines are taller).
  const placeholder = localDigits(0, locale);

  const days = data?.days ?? [];
  const activeDate =
    (pickedDate && days.some((d) => d.date === pickedDate) ? pickedDate : null) ??
    days.find((d) => d.slots.length)?.date ??
    null;
  const activeDay = days.find((d) => d.date === activeDate);
  const providerLabel = PROVIDER_LABEL[business.vertical][locale];
  const serviceName = (s: { name: string; nameMy: string | null }) => (locale === "my" && s.nameMy ? s.nameMy : s.name);

  function moveWindow(dir: 1 | -1) {
    setWindowStart((w) => {
      const next = addDays(w, dir * WINDOW_DAYS);
      return next < today ? today : next;
    });
    setPickedDate(null);
    setSlot(null);
    stripRef.current?.scrollTo({ left: 0 });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!slot || !service) return;
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    const result = await api.book({
      serviceId: service.id,
      providerId: effectiveProvider,
      start: slot,
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      note: String(form.get("note") ?? ""),
      company: String(form.get("company") ?? ""),
      locale,
      source,
    });
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.error);
      setFieldErrors((result.fields as FieldErrors) ?? {});
      if (result.status === 409) {
        setReloadKey((k) => k + 1);
        setSlot(null);
        setStep("select");
      }
      return;
    }
    setConfirmation(result.booking);
    setStep("done");
    setReloadKey((k) => k + 1);
    onBooked?.(result.booking);
  }

  function reset() {
    setStep("select");
    setSlot(null);
    setConfirmation(null);
    setFormError(null);
  }

  const header = (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{(theme ?? business.theme).name ?? business.name}</p>
        <h2 className="text-lg font-semibold tracking-tight">{t.title}</h2>
      </div>
      {business.locales.length > 1 ? (
        <div className="flex shrink-0 rounded-md border p-0.5 text-[11px]" role="group" aria-label="Language">
          {business.locales.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={l === locale}
              onClick={() => setLocale(l)}
              className={cn(
                "cursor-pointer rounded-sm px-2 py-1 text-muted-foreground",
                l === locale && "bg-muted font-medium text-foreground",
              )}
            >
              {LOCALE_LABEL[l]}
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );

  if (!service) {
    return (
      <ThemeScope theme={theme ?? business.theme} className={cn("@container w-full rounded-lg border p-5", className)}>
        {header}
        <p className="rounded-md bg-muted px-3 py-6 text-center text-sm text-muted-foreground">{t.noServices}</p>
      </ThemeScope>
    );
  }

  return (
    <ThemeScope
      theme={theme ?? business.theme}
      lang={locale}
      className={cn("@container w-full rounded-lg border p-5", className)}
    >
      {header}

      {step === "select" ? (
        <div className="grid gap-5">
          <section className="grid gap-2">
            <SectionLabel>{t.service}</SectionLabel>
            <div className="grid gap-2 @sm:grid-cols-2">
              {business.services.map((s) => (
                <Choice
                  key={s.id}
                  selected={s.id === service.id}
                  onClick={() => {
                    setServiceId(s.id);
                    setSlot(null);
                  }}
                  className="grid gap-0.5 px-3 py-2.5 text-left"
                >
                  <span className="font-medium leading-snug">{serviceName(s)}</span>
                  <span className="flex items-center gap-1.5 text-xs opacity-75">
                    <Clock className="size-3" aria-hidden />
                    {t.minutes(s.durationMin)}
                    {s.price != null ? <> · {formatPrice(s.price, s.currency, locale)}</> : null}
                  </span>
                </Choice>
              ))}
            </div>
          </section>

          {showProviderChoice ? (
            <section className="grid gap-2">
              <SectionLabel>{providerLabel}</SectionLabel>
              <div className="flex flex-wrap gap-2">
                <Choice
                  selected={!effectiveProvider}
                  onClick={() => {
                    setProviderId(null);
                    setSlot(null);
                  }}
                  className="px-3 py-2"
                >
                  {t.anyAvailable}
                </Choice>
                {serviceProviders.map((p) => (
                  <Choice
                    key={p.id}
                    selected={effectiveProvider === p.id}
                    onClick={() => {
                      setProviderId(p.id);
                      setSlot(null);
                    }}
                    className="px-3 py-2 text-left"
                  >
                    {p.name}
                  </Choice>
                ))}
              </div>
            </section>
          ) : null}

          <section className="grid gap-2">
            <div className="flex items-center justify-between">
              <SectionLabel>{t.date}</SectionLabel>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="size-7" aria-label={t.earlier} disabled={!canGoBack} onClick={() => moveWindow(-1)}>
                  <ChevronLeft />
                </Button>
                <Button variant="ghost" size="icon" className="size-7" aria-label={t.later} disabled={!canGoForward} onClick={() => moveWindow(1)}>
                  <ChevronRight />
                </Button>
              </div>
            </div>
            <div ref={stripRef} className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {data
                ? days.map((d) => {
                    const label = patientDayLabels(d.date, locale);
                    return (
                      <Choice
                        key={d.date}
                        selected={d.date === activeDate}
                        disabled={!d.slots.length}
                        aria-label={patientLocalDate(d.date, locale)}
                        onClick={() => {
                          setPickedDate(d.date);
                          setSlot(null);
                        }}
                        className={cn("flex shrink-0 flex-col items-center gap-0.5 py-2", chipWidth)}
                      >
                        <span className="text-[11px] opacity-70">{label.weekday}</span>
                        <span className="text-base font-semibold leading-tight">{label.day}</span>
                        <span className="text-[11px] opacity-70">{d.open ? label.month : t.closed}</span>
                      </Choice>
                    );
                  })
                : Array.from({ length: 7 }, (_, i) => (
                    // Same box as a date chip, so loading never changes the row height.
                    <Skeleton key={i} aria-hidden className={cn("flex shrink-0 flex-col items-center gap-0.5 border border-transparent py-2 text-sm", chipWidth)}>
                      <span className="invisible text-[11px]">{placeholder}</span>
                      <span className="invisible text-base font-semibold leading-tight">{placeholder}</span>
                      <span className="invisible text-[11px]">{placeholder}</span>
                    </Skeleton>
                  ))}
            </div>
          </section>

          <section className="grid gap-2">
            <SectionLabel>{t.time}</SectionLabel>
            {entry === "error" ? (
              <div className="grid place-items-center gap-3 rounded-md bg-muted py-6 text-center text-sm text-muted-foreground">
                {t.loadError}
                <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
                  {t.retry}
                </Button>
              </div>
            ) : !data ? (
              <div className="grid grid-cols-3 gap-2 @sm:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : activeDay?.slots.length ? (
              <div className="grid grid-cols-3 gap-2 @sm:grid-cols-4">
                {activeDay.slots.map((s) => (
                  <Choice key={s.start} selected={slot === s.start} onClick={() => setSlot(s.start)} className="h-10 tabular-nums">
                    {time(s.start)}
                  </Choice>
                ))}
              </div>
            ) : (
              <p className="rounded-md bg-muted px-3 py-6 text-center text-sm text-muted-foreground">{t.noTimes}</p>
            )}
          </section>

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-muted-foreground">
              {t.timesIn} {tz.replace(/_/g, " ")}
            </p>
            <Button disabled={!slot} onClick={() => setStep("details")}>
              {t.continue}
            </Button>
          </div>
        </div>
      ) : step === "details" && slot ? (
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="flex items-center gap-3 rounded-md bg-muted p-3">
            <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={t.back} onClick={() => setStep("select")}>
              <ArrowLeft />
            </Button>
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">
                {serviceName(service)}
                {effectiveProvider ? ` · ${business.providers.find((p) => p.id === effectiveProvider)?.name}` : ""}
              </p>
              <p className="text-muted-foreground">
                {patientDate(slot, tz, locale)} · {time(slot)}
              </p>
            </div>
          </div>

          <h3 className="text-sm font-medium">{t.details}</h3>
          <Field label={t.name} htmlFor="bw-name" error={fieldErrors.name?.[0]} required>
            <Input id="bw-name" name="name" autoComplete="name" required aria-invalid={!!fieldErrors.name} />
          </Field>
          <Field label={t.phone} htmlFor="bw-phone" error={fieldErrors.phone?.[0]} required>
            <Input
              id="bw-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="09 123 456 789"
              required
              aria-invalid={!!fieldErrors.phone}
            />
          </Field>
          <Field label={t.email} htmlFor="bw-email" hint={t.emailHint} error={fieldErrors.email?.[0]}>
            <Input id="bw-email" name="email" type="email" autoComplete="email" aria-invalid={!!fieldErrors.email} />
          </Field>
          <Field label={t.note} htmlFor="bw-note">
            <Textarea id="bw-note" name="note" rows={2} maxLength={500} />
          </Field>
          {/* Honeypot for bots; hidden from people and assistive tech. */}
          <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

          {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? <Spinner /> : null}
            {t.confirm}
          </Button>
        </form>
      ) : confirmation ? (
        <div className="grid justify-items-center gap-4 py-6 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-6" />
          </div>
          <div className="grid gap-1">
            <h3 className="text-lg font-semibold">{confirmation.status === "pending" ? t.requested : t.booked}</h3>
            <p className="text-sm">
              {serviceName(service)}
              {confirmation.providerName ? ` · ${confirmation.providerName}` : ""}
            </p>
            <p className="text-sm">
              {patientDate(confirmation.start, tz, locale)} · {time(confirmation.start)}
            </p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              {confirmation.status === "pending" ? t.requestedBody : t.bookedBody}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {confirmation.manageUrl ? (
              <a
                href={confirmation.manageUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
              >
                {t.manage}
              </a>
            ) : null}
            <Button variant="ghost" onClick={reset}>
              {t.another}
            </Button>
          </div>
        </div>
      ) : null}
    </ThemeScope>
  );
}
