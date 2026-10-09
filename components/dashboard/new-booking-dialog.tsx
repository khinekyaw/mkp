"use client";

import { Plus } from "lucide-react";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton, Spinner } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { createStaffBookingAction, staffSlotsAction, type StaffSlots } from "@/lib/dashboard/actions/bookings";
import { fmtMinutes, fmtTime } from "@/lib/format";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { cn } from "@/lib/utils";

type Service = { id: string; name: string; durationMin: number; providerIds: string[] };
type Provider = { id: string; name: string };

export function NewBookingDialog({
  slug,
  timezone,
  services,
  providers,
  defaultDate,
  trigger,
}: {
  slug: string;
  timezone: string;
  services: Service[];
  providers: Provider[];
  defaultDate: string;
  trigger?: React.ReactNode;
}) {
  const { locale, t } = useSiteCopy();
  const b = t.dash.booking;
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [providerId, setProviderId] = useState<string>("");
  const [date, setDate] = useState(defaultDate);
  const [slots, setSlots] = useState<StaffSlots | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const service = services.find((s) => s.id === serviceId);
  const eligible = providers.filter((p) => service?.providerIds.includes(p.id));

  useEffect(() => {
    if (!open || !serviceId || !date) return;
    let stale = false;
    staffSlotsAction(slug, { serviceId, providerId: providerId || null, date }).then((res) => {
      if (stale) return;
      setSlots(res);
    });
    return () => {
      stale = true;
    };
  }, [open, slug, serviceId, providerId, date]);

  function choose<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setSlots(null);
      setStart(null);
    };
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!start) {
      setError(t.dash.msg.chooseTime);
      return;
    }
    const form = new FormData(e.currentTarget);
    startSaving(async () => {
      const res = await createStaffBookingAction(slug, {
        serviceId,
        providerId: providerId || null,
        start,
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        note: String(form.get("note") ?? ""),
        locale: form.get("locale") === "my" ? "my" : "en",
      });
      if (res?.ok) {
        toast.success(b.booked);
        setOpen(false);
        setStart(null);
        setSlots(null);
        setFields({});
        setError(null);
      } else {
        setError(res?.error ?? t.dash.common.somethingWrong);
        setFields(res?.fields ?? {});
        if (res?.code === "slot_unavailable") setSlots(null);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus /> {b.newAppointment}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={b.newAppointment} description={b.newDescription} className="max-w-xl">
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">{b.addServiceFirst}</p>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={b.service} htmlFor="nb-service">
                <Select id="nb-service" value={serviceId} onChange={(e) => choose(setServiceId)(e.target.value)}>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {fmtMinutes(s.durationMin, locale)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={b.with} htmlFor="nb-provider">
                <Select id="nb-provider" value={providerId} onChange={(e) => choose(setProviderId)(e.target.value)}>
                  <option value="">{b.anyAvailable}</option>
                  {eligible.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={b.date} htmlFor="nb-date" required>
              <Input id="nb-date" type="date" value={date} onChange={(e) => choose(setDate)(e.target.value)} required />
            </Field>

            <div className="grid gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {b.time}
                <span aria-hidden className="ml-0.5 text-red-600">
                  *
                </span>
              </p>
              {!slots ? (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {Array.from({ length: 10 }, (_, i) => (
                    <Skeleton key={i} className="h-9" />
                  ))}
                </div>
              ) : "error" in slots ? (
                <p className="text-sm text-red-600">{slots.error}</p>
              ) : slots.slots.length ? (
                <div className="grid max-h-44 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
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
            </div>

            <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
              <Field label={b.patientName} htmlFor="nb-name" error={fields.name?.[0]} required>
                <Input id="nb-name" name="name" required />
              </Field>
              <Field label={t.dash.common.phone} htmlFor="nb-phone" error={fields.phone?.[0]} required>
                <Input id="nb-phone" name="phone" type="tel" placeholder="09 123 456 789" required />
              </Field>
              <Field label={b.emailOptional} htmlFor="nb-email" error={fields.email?.[0]}>
                <Input id="nb-email" name="email" type="email" />
              </Field>
              <Field label={t.dash.common.language} htmlFor="nb-locale">
                <Select id="nb-locale" name="locale" defaultValue="my">
                  <option value="my">{t.dash.common.burmese}</option>
                  <option value="en">{t.dash.common.english}</option>
                </Select>
              </Field>
              <Field label={b.noteOptional} htmlFor="nb-note" className="sm:col-span-2">
                <Textarea id="nb-note" name="note" rows={2} />
              </Field>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" disabled={saving || !start}>
              {saving ? <Spinner /> : null} {b.book}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
