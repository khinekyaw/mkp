"use client";

import { Check, Phone } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { demoApi } from "@/components/booking/api";
import { Avatar } from "@/components/ui/avatar";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { fmtTime as formatTime } from "@/lib/format";
import { addDays, dateInZone, weekday } from "@/lib/scheduling/time";
import { cn } from "@/lib/utils";
import { DEMO_BUSINESS } from "./demo-business";

// Fictional clinic content for the landing-page demo (labeled as a demo).
const DOCTORS = [
  { id: "gp", serviceId: "consult" },
  { id: "peds", serviceId: "vaccine" },
  { id: "dent", serviceId: "dental" },
] as const;

type Slots = { date: string; times: string[] };
type Booked = { doctorId: string; start: string; name: string };

const tz = DEMO_BUSINESS.timezone;

/**
 * A clinic's booking card: each doctor row shows their next open times; tapping
 * one opens an inline form that ends in a stamped confirmation. Runs on the
 * offline demo API, so nothing is saved. `backdrop` is drawn behind the card
 * only, so the caption below it always sits on the plain page.
 */
export function BookingDemo({ className, backdrop }: { className?: string; backdrop?: ReactNode }) {
  const { locale, t } = useSiteCopy();
  // Shared formatter: identical on server and client in both languages.
  const fmtTime = { format: (d: Date) => formatTime(d, tz, locale) };
  const dayLabel = (date: string, today: string) =>
    date === today ? t.demo.today : date === addDays(today, 1) ? t.demo.tomorrow : t.demo.weekdays[weekday(date)];
  const api = useMemo(() => demoApi(DEMO_BUSINESS), []);
  const [today] = useState(() => dateInZone(new Date(), tz));
  const [slots, setSlots] = useState<Record<string, Slots>>({});
  const [selected, setSelected] = useState<{ doctorId: string; start: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<Booked | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all(
      DOCTORS.map(async (d) => {
        const res = await api.availability({ serviceId: d.serviceId, providerId: d.id, from: today, days: 7 });
        // Spread the rows out so the card doesn't show three identical lists.
        const offset = DOCTORS.findIndex((x) => x.id === d.id);
        const day = res.days.filter((x) => x.slots.length)[offset === 2 ? 1 : 0];
        return [d.id, { date: day?.date ?? today, times: (day?.slots ?? []).slice(offset, offset + 3).map((s) => s.start) }] as const;
      }),
    ).then((entries) => alive && setSlots(Object.fromEntries(entries)));
    return () => {
      alive = false;
    };
  }, [api, today]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    if (name.length < 2 || phone.replace(/\D/g, "").length < 6) {
      setError(t.demo.missing);
      return;
    }
    setError(null);
    setSubmitting(true);
    const doctor = DOCTORS.find((d) => d.id === selected.doctorId)!;
    await api.book({ serviceId: doctor.serviceId, providerId: doctor.id, start: selected.start, name, phone, locale: "en", source: "widget" });
    setSubmitting(false);
    setBooked({ ...selected, name });
    setSelected(null);
  }

  return (
    <figure className={cn("grid gap-3", className)}>
      <div className="relative isolate">
        {backdrop}
        <div className="rounded-[1.5rem] bg-background p-5 shadow-[0_24px_48px_-24px_oklch(0.2_0.04_140/0.5)] sm:p-6">
          <header className="flex flex-wrap items-start justify-between gap-3 pb-3">
            <div className="grid gap-0.5">
              <p className="text-xl font-medium tracking-tight">{t.demo.clinic}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground tabular-nums">
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              {t.demo.hours}
            </span>
          </header>

          <ul className="divide-y">
            {DOCTORS.map((d) => {
              const provider = DEMO_BUSINESS.providers.find((p) => p.id === d.id)!;
              const copy = t.demo.doctors[d.id];
              const row = slots[d.id];
              const open = selected?.doctorId === d.id;
              const isBooked = booked?.doctorId === d.id;
              return (
                <li key={d.id} className="py-3.5">
                  <div className="grid gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={provider.name} size="lg" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{copy.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{copy.credentials}</p>
                      </div>
                    </div>
                    {isBooked ? (
                      <p
                        className="animate-stamp ml-[3.25rem] inline-flex w-fit items-center gap-1.5 rounded-full bg-tone-green-soft px-3 py-1.5 text-xs font-medium text-tone-green"
                        role="status"
                      >
                        <Check className="size-3.5" />
                        {t.demo.booked} · {dayLabel(row?.date ?? today, today)} {fmtTime.format(new Date(booked.start))}
                      </p>
                    ) : (
                      <div className="grid grid-cols-[minmax(2.5rem,auto)_repeat(3,minmax(0,1fr))] items-center gap-3" aria-label={t.demo.openTimes(copy.name)}>
                        <span className="text-[11px] text-muted-foreground">{row ? dayLabel(row.date, today) : " "}</span>
                        {row
                          ? row.times.map((t) => {
                              const active = open && selected?.start === t;
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => {
                                    setSelected(active ? null : { doctorId: d.id, start: t });
                                    setError(null);
                                  }}
                                  className={cn(
                                    "h-9 cursor-pointer rounded-full bg-muted px-2 text-xs font-medium tabular-nums transition-colors duration-150 outline-none hover:bg-border focus-visible:ring-2 focus-visible:ring-primary/40",
                                    active && "bg-primary text-primary-foreground hover:bg-primary",
                                  )}
                                >
                                  {fmtTime.format(new Date(t))}
                                </button>
                              );
                            })
                          : Array.from({ length: 3 }, (_, i) => <span key={i} className="h-9 rounded-full bg-muted" />)}
                      </div>
                    )}
                  </div>

                  {/* Inline booking form, revealed by animating grid rows. */}
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-300 ease-out-expo",
                      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                    aria-hidden={!open}
                  >
                    <div className="overflow-hidden">
                      {open && selected ? (
                        <form onSubmit={submit} className="grid items-end gap-2 pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" noValidate>
                          <label className="grid min-w-0 gap-1 text-[11px] text-muted-foreground">
                            {t.demo.yourName}
                            <Input name="name" autoComplete="off" className="rounded-full" />
                          </label>
                          <label className="grid min-w-0 gap-1 text-[11px] text-muted-foreground">
                            {t.demo.phone}
                            <Input name="phone" type="tel" placeholder="09 123 456 789" autoComplete="off" className="rounded-full" />
                          </label>
                          <button type="submit" disabled={submitting} className={cn(buttonVariants(), "rounded-full")}>
                            {submitting ? <Spinner /> : <Check />}
                            {t.demo.book(fmtTime.format(new Date(selected.start)))}
                          </button>
                          {error ? <p className="text-xs text-tone-red sm:col-span-3">{error}</p> : null}
                        </form>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tone-red-soft px-2.5 py-1 text-tone-red">
              <span aria-hidden className="size-1.5 rounded-full bg-tone-red" />
              {t.demo.closed}
            </span>
            <span className="inline-flex items-center gap-1.5 text-foreground tabular-nums">
              <Phone className="size-3.5" />
              {DEMO_BUSINESS.phone}
            </span>
          </footer>
        </div>
      </div>
      <figcaption className="px-1 text-xs text-muted-foreground">
        {booked ? t.demo.bookedCaption(booked.name) : t.demo.caption}
      </figcaption>
    </figure>
  );
}
