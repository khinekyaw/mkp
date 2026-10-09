"use client";

import { useState } from "react";
import type { BookingRow } from "@/lib/dashboard/queries";
import { fmtDate, fmtTime } from "@/lib/format";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { cn } from "@/lib/utils";
import { BookingDialog } from "./booking-dialog";
import { StatusBadge } from "./status-badge";

/** Clickable list of appointments; opens the detail dialog. */
export function BookingList({
  bookings,
  slug,
  timezone,
  showDate = true,
  className,
}: {
  bookings: BookingRow[];
  slug: string;
  timezone: string;
  showDate?: boolean;
  className?: string;
}) {
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const { locale } = useSiteCopy();
  return (
    <>
      <ul className={cn("divide-y", className)}>
        {bookings.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => setSelected(b)}
              className="grid w-full cursor-pointer grid-cols-[4.5rem_1fr_auto] items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/60 sm:grid-cols-[7rem_1fr_auto]"
            >
              <span className="grid">
                <span className="font-medium tabular-nums">{fmtTime(b.startsAt, timezone, locale)}</span>
                {showDate ? <span className="text-xs text-muted-foreground">{fmtDate(b.startsAt, timezone, undefined, locale)}</span> : null}
              </span>
              <span className="min-w-0">
                <span className={cn("block truncate font-medium", b.status === "cancelled" && "text-muted-foreground line-through")}>
                  {b.customerName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {b.serviceName} · {b.providerName}
                </span>
              </span>
              <StatusBadge status={b.status} />
            </button>
          </li>
        ))}
      </ul>
      <BookingDialog booking={selected} slug={slug} timezone={timezone} onOpenChange={(o) => !o && setSelected(null)} />
    </>
  );
}
