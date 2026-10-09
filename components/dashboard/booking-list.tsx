"use client";

import { useState } from "react";
import type { BookingRow } from "@/lib/dashboard/queries";
import { fmtDate, fmtTime } from "@/lib/format";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { cn } from "@/lib/utils";
import { List, listRow } from "@/components/ui/list";
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
      <List className={className}>
        {bookings.map((b) => (
          <li key={b.id}>
            <button
              type="button"
              onClick={() => setSelected(b)}
              className={cn(listRow, "grid grid-cols-[4.5rem_1fr_auto] text-sm sm:grid-cols-[7rem_1fr_auto]")}
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
      </List>
      <BookingDialog booking={selected} slug={slug} timezone={timezone} onOpenChange={(o) => !o && setSelected(null)} />
    </>
  );
}
