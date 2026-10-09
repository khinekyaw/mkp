"use client";

import Link from "next/link";
import { useState } from "react";
import { useSiteCopy } from "@/components/i18n/site-locale";
import type { BookingRow } from "@/lib/dashboard/queries";
import { fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BookingDialog } from "../booking-dialog";
import { STATUS_DOT } from "../status-badge";

export type MonthDay = {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  /** No opening hours that weekday, or a whole-clinic closure. */
  closed: boolean;
  href: string;
  bookings: BookingRow[];
};

const MAX_ROWS = 3;

/** Six-week month grid (Monday first). Click a day for its day view, an appointment for details. */
export function MonthGrid({ slug, timezone, days }: { slug: string; timezone: string; days: MonthDay[] }) {
  const { locale, t } = useSiteCopy();
  const c = t.dash.calendar;
  const [selected, setSelected] = useState<BookingRow | null>(null);
  // Monday-first weekday headers.
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="overflow-x-auto rounded-lg bg-background [scrollbar-width:thin]">
      <div className="grid min-w-[44rem] grid-cols-7">
        {order.map((wd) => (
          <div key={wd} className="truncate border-b px-2 py-2 text-center text-[11px] font-medium text-muted-foreground">
            {t.dash.weekdaysShort[wd]}
          </div>
        ))}
        {days.map((d, i) => {
          const active = d.bookings.filter((b) => b.status !== "cancelled");
          const extra = active.length - MAX_ROWS;
          return (
            <div
              key={d.date}
              className={cn(
                "grid min-h-28 content-start gap-1 border-b p-1.5",
                i % 7 !== 0 && "border-l",
                (!d.inMonth || d.closed) && "bg-muted/60",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <Link
                  href={d.href}
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs font-medium tabular-nums transition-colors hover:bg-muted",
                    !d.inMonth && "text-muted-foreground",
                    d.isToday && "bg-primary text-primary-foreground hover:bg-primary",
                  )}
                >
                  {d.day}
                </Link>
                {d.closed && d.inMonth ? <span className="truncate pr-1 text-[10px] text-muted-foreground">{c.closed}</span> : null}
              </div>
              {active.slice(0, MAX_ROWS).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelected(b)}
                  className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px] transition-colors hover:bg-muted"
                >
                  <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[b.status])} />
                  <span className="shrink-0 text-muted-foreground tabular-nums">{fmtTime(b.startsAt, timezone, locale)}</span>
                  <span className="truncate">{b.customerName}</span>
                </button>
              ))}
              {extra > 0 ? (
                <Link href={d.href} className="w-fit rounded-md px-1.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                  {c.more(extra)}
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>
      <BookingDialog booking={selected} slug={slug} timezone={timezone} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
