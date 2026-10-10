"use client";

import { useEffect, useState, useTransition } from "react";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton, Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { rescheduleStaffBookingAction, staffRescheduleSlotsAction, type StaffSlots } from "@/lib/dashboard/actions/bookings";
import { fmtTime } from "@/lib/format";
import { dateInZone } from "@/lib/scheduling/time";
import { cn } from "@/lib/utils";

/** Pick a new date and time for an appointment, same staff member. */
export function ReschedulePanel({
  slug,
  bookingId,
  startsAt,
  timezone,
  onDone,
  onCancel,
}: {
  slug: string;
  bookingId: string;
  startsAt: Date | string;
  timezone: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { locale, t } = useSiteCopy();
  const b = t.dash.booking;
  const [date, setDate] = useState(() => dateInZone(new Date(startsAt), timezone));
  const [slots, setSlots] = useState<StaffSlots | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    let stale = false;
    staffRescheduleSlotsAction(slug, { bookingId, providerId: null, date }).then((res) => {
      if (!stale) setSlots(res);
    });
    return () => {
      stale = true;
    };
  }, [slug, bookingId, date]);

  function save() {
    if (!start) return;
    setError(null);
    startSaving(async () => {
      const res = await rescheduleStaffBookingAction(slug, { bookingId, start, providerId: null });
      if (res.ok) {
        toast.success(b.rescheduledToast);
        onDone();
      } else {
        setError(res.error ?? t.dash.common.somethingWrong);
        if (res.code === "slot_unavailable") setSlots(null);
      }
    });
  }

  return (
    <div className="grid gap-3 rounded-md border p-3">
      <p className="text-sm font-medium">{b.rescheduleTitle}</p>
      <Field label={b.date} htmlFor="rs-date">
        <Input
          id="rs-date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSlots(null);
            setStart(null);
          }}
        />
      </Field>
      {!slots ? (
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-9" />
          ))}
        </div>
      ) : "error" in slots ? (
        <p className="text-sm text-red-600">{slots.error}</p>
      ) : slots.slots.length ? (
        <div className="grid max-h-40 grid-cols-4 gap-2 overflow-y-auto">
          {slots.slots.map((s) => (
            <button
              key={s.start}
              type="button"
              aria-pressed={start === s.start}
              onClick={() => setStart(s.start)}
              className={cn(
                "h-9 cursor-pointer rounded-md border text-sm tabular-nums hover:border-foreground/40",
                start === s.start && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {fmtTime(s.start, timezone, locale)}
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-md bg-muted px-3 py-4 text-center text-sm text-muted-foreground">
          {slots.open ? b.fullyBooked : b.closedDay}
        </p>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button onClick={save} disabled={!start || saving}>
          {saving ? <Spinner /> : null} {b.rescheduleSave}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          {b.rescheduleBack}
        </Button>
      </div>
    </div>
  );
}
