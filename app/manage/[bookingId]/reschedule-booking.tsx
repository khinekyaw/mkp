"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton, Spinner } from "@/components/ui/misc";
import { patientTime } from "@/lib/format";
import { MESSAGES, type Locale } from "@/lib/i18n";
import { addDays } from "@/lib/scheduling/time";
import { cn } from "@/lib/utils";
import { customerSlotsAction, rescheduleByCustomer, type CustomerSlots } from "./actions";

export function RescheduleBooking({
  bookingId,
  token,
  locale,
  timezone,
  today,
  horizonDays,
  initialDate,
}: {
  bookingId: string;
  token: string;
  locale: Locale;
  timezone: string;
  /** YYYY-MM-DD in the business timezone. */
  today: string;
  horizonDays: number;
  initialDate: string;
}) {
  const t = MESSAGES[locale];
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState<CustomerSlots | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (!open || !date) return;
    let current = true;
    customerSlotsAction(bookingId, token, date).then((r) => current && setSlots(r));
    return () => {
      current = false;
    };
  }, [open, date, bookingId, token]);

  if (done) return <p className="text-sm">{t.rescheduled}</p>;
  if (!open) {
    return (
      <Button variant="outline" className="w-fit" onClick={() => setOpen(true)}>
        {t.reschedule}
      </Button>
    );
  }

  function confirm() {
    if (!picked) return;
    setError(null);
    startSaving(async () => {
      const result = await rescheduleByCustomer(bookingId, token, picked);
      if (result.ok) setDone(true);
      else setError(t.errors[result.code ?? "generic"] ?? t.errors.generic);
    });
  }

  return (
    <div className="grid gap-4 rounded-lg border p-4">
      <p className="text-sm font-medium">{t.rescheduleTitle}</p>
      <Field label={t.pickDate} htmlFor="rs-date">
        <Input
          id="rs-date"
          type="date"
          value={date}
          min={today}
          max={addDays(today, horizonDays)}
          onChange={(e) => {
            setDate(e.target.value);
            setSlots(null);
            setPicked(null);
          }}
        />
      </Field>
      {!slots ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : "code" in slots ? (
        <p className="text-sm text-red-600">{t.errors[slots.code] ?? t.errors.generic}</p>
      ) : !slots.open ? (
        <p className="text-sm text-muted-foreground">{t.closed}</p>
      ) : slots.slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noTimes}</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {slots.slots.map((start) => (
            <button
              key={start}
              type="button"
              aria-pressed={picked === start}
              onClick={() => setPicked(start)}
              className={cn(
                "h-9 cursor-pointer rounded-md border bg-background text-sm transition-colors outline-none hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/30",
                picked === start && "border-primary bg-primary text-primary-foreground hover:border-primary",
              )}
            >
              {patientTime(start, timezone, locale)}
            </button>
          ))}
        </div>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button onClick={confirm} disabled={!picked || saving}>
          {saving ? <Spinner /> : null}
          {t.rescheduleConfirm}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
          {t.keep}
        </Button>
      </div>
    </div>
  );
}
