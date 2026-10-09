"use client";

import { useEffect, useState } from "react";
import type { BookingRow } from "@/lib/dashboard/queries";
import { fmtClock, fmtTime, formatHours } from "@/lib/format";
import { minutesInZone } from "@/lib/scheduling/time";
import { Avatar } from "./avatar";
import { cn } from "@/lib/utils";
import { BookingDialog } from "./booking-dialog";
import { STATUS_STYLE } from "./status-badge";

const PX_PER_MIN = 64 / 60;

type Column = {
  id: string;
  name: string;
  title: string | null;
  working: { startMin: number; endMin: number }[];
  absences: { startMin: number; endMin: number; reason: string | null }[];
};
type CalendarBooking = BookingRow & { startMin: number; endMin: number };

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
      <span className="-ml-1 size-2 rounded-full bg-red-500" />
      <span className="h-px flex-1 bg-red-500" />
    </div>
  );
}

export function CalendarDay({
  slug,
  timezone,
  isToday,
  gridStart,
  gridEnd,
  columns,
  bookings,
}: {
  slug: string;
  timezone: string;
  isToday: boolean;
  gridStart: number;
  gridEnd: number;
  columns: Column[];
  bookings: CalendarBooking[];
}) {
  const [selected, setSelected] = useState<BookingRow | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const height = (gridEnd - gridStart) * PX_PER_MIN;
  const hours = Array.from({ length: (gridEnd - gridStart) / 60 + 1 }, (_, i) => gridStart + i * 60);
  const visible = bookings.filter((b) => showCancelled || b.status !== "cancelled");
  const cancelledCount = bookings.length - bookings.filter((b) => b.status !== "cancelled").length;

  if (!columns.length) {
    return <p className="rounded-lg border border-dashed bg-background/60 p-10 text-center text-sm text-muted-foreground">Add staff to see the calendar.</p>;
  }

  return (
    <div className="grid gap-2">
      {cancelledCount ? (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="accent-foreground" />
          Show {cancelledCount} cancelled
        </label>
      ) : null}
      <div className="overflow-x-auto rounded-lg bg-background">
        <div className="grid min-w-fit" style={{ gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(11rem, 1fr))` }}>
          {/* Header row */}
          <div className="sticky left-0 z-10 border-b bg-background" />
          {columns.map((c) => (
            <div key={c.id} className="flex min-w-0 items-center gap-2.5 border-b border-l px-3 py-3">
              <Avatar name={c.name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground tabular-nums">
                  {formatHours(c.working) ?? "Off today"}
                  {c.title ? ` · ${c.title}` : ""}
                </p>
              </div>
            </div>
          ))}

          {/* Time gutter */}
          <div className="sticky left-0 z-10 bg-background" style={{ height }}>
            <div className="relative h-full">
              {hours.map((m) => (
                <span key={m} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums" style={{ top: (m - gridStart) * PX_PER_MIN }}>
                  {m === gridStart ? "" : fmtClock(m).replace(":00", "")}
                </span>
              ))}
            </div>
          </div>

          {columns.map((c) => (
            <div key={c.id} className="relative border-l bg-muted" style={{ height }}>
              {/* Working hours are white; everything else stays shaded. */}
              {c.working.map((w, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 bg-background"
                  style={{ top: (w.startMin - gridStart) * PX_PER_MIN, height: (w.endMin - w.startMin) * PX_PER_MIN }}
                />
              ))}
              {hours.map((m) => (
                <div key={m} className="absolute inset-x-0 border-t border-border/70" style={{ top: (m - gridStart) * PX_PER_MIN }} />
              ))}
              {c.absences.map((a, i) => (
                <div
                  key={`a${i}`}
                  className="absolute inset-x-0 z-[1] bg-border/80 px-2 pt-1 text-[11px] font-medium text-muted-foreground"
                  style={{ top: (Math.max(a.startMin, gridStart) - gridStart) * PX_PER_MIN, height: (Math.min(a.endMin, gridEnd) - Math.max(a.startMin, gridStart)) * PX_PER_MIN }}
                >
                  {a.reason ?? "Time off"}
                </div>
              ))}
              {isToday ? <NowLine timezone={timezone} gridStart={gridStart} gridEnd={gridEnd} /> : null}
              {visible
                .filter((b) => b.providerId === c.id)
                .map((b) => {
                  const h = Math.max(22, (b.endMin - b.startMin) * PX_PER_MIN - 2);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelected(b)}
                      className={cn(
                        "absolute inset-x-1 z-10 cursor-pointer overflow-hidden rounded-lg px-2 py-1 text-left text-xs leading-tight transition-[filter] duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                        STATUS_STYLE[b.status],
                      )}
                      style={{ top: (b.startMin - gridStart) * PX_PER_MIN + 1, height: h }}
                    >
                      <span className="block truncate font-medium">{b.customerName}</span>
                      {h > 34 ? (
                        <span className="block truncate opacity-75">
                          {fmtTime(b.startsAt, timezone)} · {b.serviceName}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
      <BookingDialog booking={selected} slug={slug} timezone={timezone} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
