"use client";

import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { useActionState, useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { addTimeOffAction, deleteTimeOffAction } from "@/lib/dashboard/actions/catalog";
import { fmtDate, fmtTime } from "@/lib/format";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { useActionFeedback } from "./use-action-feedback";

type Entry = { id: string; startsAt: Date; endsAt: Date; reason: string | null; providerName?: string | null };

/** Lists upcoming absences/closures; adding one opens a dialog. providerId undefined = whole business. */
export function TimeOffManager({
  slug,
  timezone,
  entries,
  providerId,
  today,
  emptyLabel,
}: {
  slug: string;
  timezone: string;
  entries: Entry[];
  providerId?: string;
  today: string;
  emptyLabel: string;
}) {
  const { locale, t } = useSiteCopy();
  const o = t.dash.timeOff;
  const [allDay, setAllDay] = useState(true);
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addTimeOffAction.bind(null, slug), null);
  const [removing, startRemove] = useTransition();
  const close = useCallback(() => setOpen(false), []);
  useActionFeedback(state, close);
  const err = (k: string) => state?.fields?.[k]?.[0];

  const date = (d: Date) => fmtDate(d, timezone, undefined, locale);
  const time = (d: Date) => fmtTime(d, timezone, locale);
  const describe = (e: Entry) => {
    const sameDay = fmtDate(e.startsAt, timezone) === fmtDate(new Date(e.endsAt.getTime() - 1), timezone);
    // Midnight to midnight means whole days (checked in English so it's locale-proof).
    const fullDays = fmtTime(e.startsAt, timezone) === "12:00 AM" && fmtTime(e.endsAt, timezone) === "12:00 AM";
    if (fullDays) {
      return sameDay ? date(e.startsAt) : `${date(e.startsAt)} – ${date(new Date(e.endsAt.getTime() - 1))}`;
    }
    return sameDay
      ? `${date(e.startsAt)}, ${time(e.startsAt)} – ${time(e.endsAt)}`
      : `${date(e.startsAt)} ${time(e.startsAt)} – ${date(e.endsAt)} ${time(e.endsAt)}`;
  };

  return (
    <div className="grid gap-4">
      {entries.length ? (
        <ul className="divide-y rounded-md border bg-background">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <CalendarOff className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block">{describe(e)}</span>
                {e.reason || e.providerName ? (
                  <span className="block truncate text-xs text-muted-foreground">{[e.providerName, e.reason].filter(Boolean).join(" · ")}</span>
                ) : null}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t.dash.common.remove}
                disabled={removing}
                onClick={() =>
                  startRemove(async () => {
                    const res = await deleteTimeOffAction(slug, e.id);
                    if (res?.message) toast.success(res.message);
                  })
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-fit">
            <Plus /> {providerId ? o.addTimeOff : o.addClosure}
          </Button>
        </DialogTrigger>
        <DialogContent title={providerId ? o.addTimeOff : o.addClosure}>
          <form action={action} className="grid gap-3">
            {providerId ? <input type="hidden" name="providerId" value={providerId} /> : null}
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
              <Checkbox name="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
              {o.allDay}
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Field label={o.from} htmlFor={`to-start-${providerId ?? "biz"}`} error={err("startDate")} required>
                  <Input id={`to-start-${providerId ?? "biz"}`} name="startDate" type="date" min={today} defaultValue={today} required />
                </Field>
                {!allDay ? (
                  <Field label={o.time} htmlFor={`to-st-${providerId ?? "biz"}`} error={err("startTime")} required>
                    <Input id={`to-st-${providerId ?? "biz"}`} name="startTime" type="time" defaultValue="12:00" required />
                  </Field>
                ) : null}
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Field label={o.until} htmlFor={`to-end-${providerId ?? "biz"}`} error={err("endDate")} required>
                  <Input id={`to-end-${providerId ?? "biz"}`} name="endDate" type="date" min={today} defaultValue={today} required />
                </Field>
                {!allDay ? (
                  <Field label={o.time} htmlFor={`to-et-${providerId ?? "biz"}`} required>
                    <Input id={`to-et-${providerId ?? "biz"}`} name="endTime" type="time" defaultValue="13:00" required />
                  </Field>
                ) : null}
              </div>
            </div>
            <Field label={o.reason} htmlFor={`to-reason-${providerId ?? "biz"}`}>
              <Input id={`to-reason-${providerId ?? "biz"}`} name="reason" placeholder={providerId ? o.reasonStaff : o.reasonClinic} />
            </Field>
            {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null} {providerId ? o.addTimeOff : o.addClosure}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
