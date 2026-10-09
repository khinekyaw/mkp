"use client";

import { CalendarDays, Clock, Mail, MessageSquare, Phone, Stethoscope, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import { setBookingStatusAction } from "@/lib/dashboard/actions/bookings";
import type { BookingRow } from "@/lib/dashboard/queries";
import type { BookingStatus } from "@/lib/db/schema";
import { fmtDate, fmtTime } from "@/lib/format";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { StatusBadge } from "./status-badge";

export function BookingDialog({
  booking,
  slug,
  timezone,
  onOpenChange,
}: {
  booking: BookingRow | null;
  slug: string;
  timezone: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { locale, t } = useSiteCopy();
  const b = t.dash.booking;
  const [pending, startTransition] = useTransition();
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");

  function update(status: BookingStatus, cancelReason?: string) {
    if (!booking) return;
    startTransition(async () => {
      const res = await setBookingStatusAction(slug, booking.id, status, cancelReason);
      if (res?.ok) {
        toast.success(status === "cancelled" ? b.cancelledToast : b.updatedToast);
        setCancelling(false);
        onOpenChange(false);
      } else toast.error(res?.error ?? t.dash.common.somethingWrong);
    });
  }

  const tel = booking?.customerPhone.replace(/[^\d+]/g, "");
  const isActive = booking?.status === "pending" || booking?.status === "confirmed";

  return (
    <Dialog
      open={!!booking}
      onOpenChange={(o) => {
        if (!o) setCancelling(false);
        onOpenChange(o);
      }}
    >
      {booking ? (
        <DialogContent title={booking.customerName} description={b.serviceWith(booking.serviceName, booking.providerName)}>
          <div className="flex items-center gap-2">
            <StatusBadge status={booking.status} />
            <span className="text-xs text-muted-foreground">{b.via(t.dash.source[booking.source])}</span>
          </div>

          <dl className="grid gap-2.5 text-sm [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <CalendarDays aria-hidden />
              {fmtDate(booking.startsAt, timezone, { weekday: "long", month: "long", day: "numeric", year: "numeric" }, locale)}
            </div>
            <div className="flex items-center gap-2.5">
              <Clock aria-hidden />
              {fmtTime(booking.startsAt, timezone, locale)} – {fmtTime(booking.endsAt, timezone, locale)}
            </div>
            <div className="flex items-center gap-2.5">
              <Stethoscope aria-hidden />
              {booking.serviceName} · {booking.providerName}
            </div>
            <div className="flex items-center gap-2.5">
              <Phone aria-hidden />
              <a href={`tel:${tel}`} className="underline-offset-4 hover:underline">
                {booking.customerPhone}
              </a>
            </div>
            {booking.customerEmail ? (
              <div className="flex items-center gap-2.5">
                <Mail aria-hidden />
                <a href={`mailto:${booking.customerEmail}`} className="truncate underline-offset-4 hover:underline">
                  {booking.customerEmail}
                </a>
              </div>
            ) : null}
            {booking.note ? (
              <div className="flex gap-2.5">
                <MessageSquare aria-hidden className="mt-0.5" />
                <p className="whitespace-pre-wrap">{booking.note}</p>
              </div>
            ) : null}
            {booking.cancelReason ? (
              <p className="rounded-md bg-muted p-2.5 text-xs text-muted-foreground">{b.cancelledReason(booking.cancelReason)}</p>
            ) : null}
          </dl>

          <Link
            href={`/dashboard/${slug}/customers/${booking.customerId}`}
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
          >
            <UserRound className="size-4" /> {b.history}
          </Link>

          {cancelling ? (
            <div className="grid gap-2 rounded-md border p-3">
              <p className="text-sm font-medium">{b.cancelQuestion}</p>
              <Input placeholder={b.reasonPlaceholder} value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={() => update("cancelled", reason)} disabled={pending}>
                  {pending ? <Spinner /> : null} {b.cancel}
                </Button>
                <Button variant="ghost" onClick={() => setCancelling(false)} disabled={pending}>
                  {b.keep}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              {booking.status === "pending" ? (
                <Button onClick={() => update("confirmed")} disabled={pending}>
                  {b.confirm}
                </Button>
              ) : null}
              {booking.status === "confirmed" ? (
                <>
                  <Button onClick={() => update("completed")} disabled={pending}>
                    {b.markCompleted}
                  </Button>
                  <Button variant="outline" onClick={() => update("no_show")} disabled={pending}>
                    {b.noShow}
                  </Button>
                </>
              ) : null}
              {booking.status === "completed" || booking.status === "no_show" ? (
                <Button variant="outline" onClick={() => update("confirmed")} disabled={pending}>
                  {b.undo}
                </Button>
              ) : null}
              {isActive ? (
                <Button variant="ghost" onClick={() => setCancelling(true)} disabled={pending} className="sm:ml-auto">
                  {b.cancel}
                </Button>
              ) : null}
              {pending ? <Spinner className="self-center" /> : null}
            </div>
          )}
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
