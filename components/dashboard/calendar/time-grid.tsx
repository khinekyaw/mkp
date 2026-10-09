"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useSiteCopy } from "@/components/i18n/site-locale";
import type { BookingRow } from "@/lib/dashboard/queries";
import { fmtClock, fmtTime } from "@/lib/format";
import { layoutLanes } from "@/lib/scheduling/lanes";
import { minutesInZone } from "@/lib/scheduling/time";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { BookingDialog } from "../booking-dialog";
import { STATUS_STYLE } from "../status-badge";

const PX_PER_MIN = 64 / 60;

export type GridBooking = BookingRow & { startMin: number; endMin: number };

/** One column of the grid: a doctor (day view) or a date (week view). */
export type GridColumn = {
  key: string;
  header:
    | { kind: "doctor"; name: string; detail: string | null }
    | { kind: "date"; weekday: string; day: number; href: string };
  isToday: boolean;
  working: { startMin: number; endMin: number }[];
  absences: { startMin: number; endMin: number; reason: string | null }[];
  bookings: GridBooking[];
};

function NowLine({ timezone, gridStart, gridEnd }: { timezone: string; gridStart: number; gridEnd: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(minutesInZone(new Date(), timezone));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [timezone]);
  if (now === null || now < gridStart || now > gridEnd) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: (now - gridStart) * PX_PER_MIN }}>
      <span className="-ml-1 size-2 rounded-full bg-tone-red" />
      <span className="h-px flex-1 bg-tone-red" />
    </div>
  );
}

/** Smallest height worth scrolling inside; below it the page scrolls instead. */
const MIN_HEIGHT = 360;

/**
 * Caps the scroll box at the space left in the window, so the page itself never
 * scrolls and there is only one scrollbar (like Google Calendar).
 */
function useFitToViewport(ref: RefObject<HTMLDivElement | null>, deps: unknown[]) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.maxHeight = "";
      const rest = document.documentElement.scrollHeight - el.offsetHeight;
      // -1px absorbs sub-pixel rounding so the page can't overflow by a hair.
      el.style.maxHeight = `${Math.max(MIN_HEIGHT, Math.floor(window.innerHeight - rest) - 1)}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refit when the grid's content changes
  }, deps);
}

/**
 * Time-of-day grid shared by the day view (a column per doctor) and the week
 * view (a column per date). Outside working hours is shaded; overlapping
 * appointments sit side by side.
 */
export function TimeGrid({
  slug,
  timezone,
  gridStart,
  gridEnd,
  columns,
  showDoctor,
}: {
  slug: string;
  timezone: string;
  gridStart: number;
  gridEnd: number;
  columns: GridColumn[];
  /** Label each appointment with its doctor (week view across all doctors). */
  showDoctor: boolean;
}) {
  const { locale, t } = useSiteCopy();
  const c = t.dash.calendar;
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  useFitToViewport(scroller, [columns, gridStart, gridEnd, showCancelled]);
  const height = (gridEnd - gridStart) * PX_PER_MIN;
  const hours = Array.from({ length: (gridEnd - gridStart) / 60 + 1 }, (_, i) => gridStart + i * 60);
  const cancelledCount = columns.reduce((n, col) => n + col.bookings.filter((b) => b.status === "cancelled").length, 0);
  const minCol = columns.length > 1 ? (columns[0].header.kind === "date" ? "7.5rem" : "11rem") : "16rem";

  return (
    <div className="grid gap-2">
      {cancelledCount ? (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="accent-foreground" />
          {c.showCancelled(cancelledCount)}
        </label>
      ) : null}
      <div ref={scroller} className="overflow-auto overscroll-contain rounded-lg bg-background [scrollbar-width:thin]">
        <div className="grid min-w-fit" style={{ gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(${minCol}, 1fr))` }}>
          {/* Header row, pinned while scrolling through the day. */}
          <div className="sticky top-0 left-0 z-30 border-b bg-background" />
          {columns.map((col) => (
            <div key={col.key} className="sticky top-0 z-20 border-b border-l bg-background">
              {col.header.kind === "doctor" ? (
                <div className="flex min-w-0 items-center gap-2.5 px-3 py-3">
                  <Avatar name={col.header.name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{col.header.name}</p>
                    <p className="truncate text-xs text-muted-foreground tabular-nums">{col.header.detail ?? c.offToday}</p>
                  </div>
                </div>
              ) : (
                <Link href={col.header.href} className="grid justify-items-center gap-0.5 px-2 py-2.5 transition-colors hover:bg-muted/60">
                  <span className={cn("text-[11px] text-muted-foreground", col.isToday && "font-medium text-primary")}>{col.header.weekday}</span>
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full text-lg leading-none font-medium tabular-nums",
                      col.isToday && "bg-primary text-primary-foreground",
                    )}
                  >
                    {col.header.day}
                  </span>
                </Link>
              )}
            </div>
          ))}

          {/* Time gutter */}
          <div className="sticky left-0 z-10 bg-background" style={{ height }}>
            <div className="relative h-full">
              {hours.map((m) => (
                <span key={m} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums" style={{ top: (m - gridStart) * PX_PER_MIN }}>
                  {m === gridStart ? "" : fmtClock(m, locale).replace(":00", "")}
                </span>
              ))}
            </div>
          </div>

          {columns.map((col) => {
            const visible = layoutLanes(col.bookings.filter((b) => showCancelled || b.status !== "cancelled"));
            return (
              <div key={col.key} className={cn("relative border-l bg-muted", col.isToday && "bg-sage-soft/25")} style={{ height }}>
                {/* Working hours are white; everything else stays shaded. */}
                {col.working.map((w, i) => (
                  <div
                    key={i}
                    className={cn("absolute inset-x-0 bg-background", col.isToday && "bg-background/90")}
                    style={{ top: (w.startMin - gridStart) * PX_PER_MIN, height: (w.endMin - w.startMin) * PX_PER_MIN }}
                  />
                ))}
                {hours.map((m) => (
                  <div key={m} className="absolute inset-x-0 border-t border-border/70" style={{ top: (m - gridStart) * PX_PER_MIN }} />
                ))}
                {col.absences.map((a, i) => (
                  <div
                    key={`a${i}`}
                    className="absolute inset-x-0 z-[1] bg-border/80 px-2 pt-1 text-[11px] font-medium text-muted-foreground"
                    style={{
                      top: (Math.max(a.startMin, gridStart) - gridStart) * PX_PER_MIN,
                      height: (Math.min(a.endMin, gridEnd) - Math.max(a.startMin, gridStart)) * PX_PER_MIN,
                    }}
                  >
                    {a.reason ?? c.timeOff}
                  </div>
                ))}
                {col.isToday ? <NowLine timezone={timezone} gridStart={gridStart} gridEnd={gridEnd} /> : null}
                {visible.map((b) => {
                  const h = Math.max(22, (b.endMin - b.startMin) * PX_PER_MIN - 2);
                  const width = 100 / b.lanes;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelected(b)}
                      className={cn(
                        "absolute z-10 cursor-pointer overflow-hidden rounded-lg px-2 py-1 text-left text-xs leading-tight ring-1 ring-background transition-[filter] duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                        STATUS_STYLE[b.status],
                      )}
                      style={{
                        top: (b.startMin - gridStart) * PX_PER_MIN + 1,
                        height: h,
                        left: `calc(${b.lane * width}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                      }}
                    >
                      <span className="block truncate font-medium">{b.customerName}</span>
                      {h > 34 ? (
                        <span className="block truncate opacity-75">
                          {fmtTime(b.startsAt, timezone, locale)} · {showDoctor ? b.providerName : b.serviceName}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <BookingDialog booking={selected} slug={slug} timezone={timezone} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
