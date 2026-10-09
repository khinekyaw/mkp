"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import type { BookingRow } from "@/lib/dashboard/queries";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { BookingDialog } from "./booking-dialog";
import { STATUS_DOT } from "./status-badge";

/** Today's appointments as time-led rows; each opens the detail dialog. */
export function TodayAppointments({ bookings, slug, timezone }: { bookings: BookingRow[]; slug: string; timezone: string }) {
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const { t } = useSiteCopy();
  const time = (d: Date) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(d));

  return (
    <>
      <ul className="divide-y">
        {bookings.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => setSelected(b)}
              className="group grid w-full cursor-pointer grid-cols-[3.25rem_auto_minmax(0,1fr)_auto] items-center gap-2.5 py-2.5 text-left outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className="text-base font-medium tabular-nums">{time(b.startsAt)}</span>
              <Avatar name={b.customerName} size="sm" />
              <span className="min-w-0">
                <span className={cn("block truncate text-[13px] font-medium", b.status === "cancelled" && "text-muted-foreground line-through")}>
                  {b.customerName}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[b.status])} />
                  <span className="sr-only">{t.dash.status[b.status]}, </span>
                  <span className="truncate">{b.serviceName}</span>
                </span>
              </span>
              <span className="grid size-6 place-items-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <ChevronRight className="size-3.5" />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <BookingDialog booking={selected} slug={slug} timezone={timezone} onOpenChange={(o) => !o && setSelected(null)} />
    </>
  );
}
