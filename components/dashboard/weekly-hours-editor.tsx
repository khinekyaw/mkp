"use client";

import { Copy, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { cn } from "@/lib/utils";

type Interval = { weekday: number; startMin: number; endMin: number };
type Day = { open: boolean; ranges: { start: string; end: string }[] };

// Monday-first display order.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

const toTime = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

function fromIntervals(intervals: Interval[]): Day[] {
  return Array.from({ length: 7 }, (_, d) => {
    const ranges = intervals
      .filter((i) => i.weekday === d)
      .sort((a, b) => a.startMin - b.startMin)
      .map((i) => ({ start: toTime(i.startMin), end: i.endMin >= 1440 ? "23:59" : toTime(i.endMin) }));
    return { open: ranges.length > 0, ranges: ranges.length ? ranges : [{ start: "09:00", end: "17:00" }] };
  });
}

function toIntervals(days: Day[]): Interval[] {
  return days.flatMap((day, weekday) =>
    day.open ? day.ranges.map((r) => ({ weekday, startMin: toMin(r.start), endMin: r.end === "23:59" ? 1440 : toMin(r.end) })) : [],
  );
}

/** Editable weekly schedule; submits as JSON in a hidden `schedule` field. */
export function WeeklyHoursEditor({ initial, disabled }: { initial: Interval[]; disabled?: boolean }) {
  const { t } = useSiteCopy();
  const h = t.dash.hours;
  const WEEKDAYS = t.dash.weekdays;
  const [days, setDays] = useState<Day[]>(() => fromIntervals(initial));
  const set = (d: number, next: Day) => setDays((all) => all.map((x, i) => (i === d ? next : x)));

  return (
    <div className={cn("grid gap-1", disabled && "pointer-events-none opacity-40")}>
      <input type="hidden" name="schedule" value={JSON.stringify(toIntervals(days))} />
      {ORDER.map((d) => {
        const day = days[d];
        return (
          <div key={d} className="grid grid-cols-[7.5rem_1fr] items-start gap-3 border-b py-2.5 last:border-0 sm:grid-cols-[9rem_1fr]">
            <label className="flex h-9 cursor-pointer items-center gap-2.5 text-sm">
              <Switch checked={day.open} onCheckedChange={(open) => set(d, { ...day, open })} aria-label={h.openOn(WEEKDAYS[d])} />
              <span className={day.open ? "" : "text-muted-foreground"}>{t.dash.weekdaysShort[d]}</span>
            </label>
            {day.open ? (
              <div className="grid gap-2">
                {day.ranges.map((r, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      value={r.start}
                      aria-label={h.opens(WEEKDAYS[d])}
                      onChange={(e) => set(d, { ...day, ranges: day.ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)) })}
                      className="h-9 rounded-md border bg-background px-2 text-sm tabular-nums"
                    />
                    <span className="text-muted-foreground">–</span>
                    <input
                      type="time"
                      value={r.end}
                      aria-label={h.closes(WEEKDAYS[d])}
                      onChange={(e) => set(d, { ...day, ranges: day.ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)) })}
                      className="h-9 rounded-md border bg-background px-2 text-sm tabular-nums"
                    />
                    {day.ranges.length > 1 ? (
                      <Button variant="ghost" size="icon" className="size-8" aria-label={h.removeRange} onClick={() => set(d, { ...day, ranges: day.ranges.filter((_, j) => j !== i) })}>
                        <X />
                      </Button>
                    ) : null}
                    {i === day.ranges.length - 1 ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={h.addRange}
                          title={h.addRangeHint}
                          onClick={() => set(d, { ...day, ranges: [...day.ranges, { start: r.end, end: r.end < "17:00" ? "17:00" : "20:00" }] })}
                        >
                          <Plus />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={h.copyAll}
                          title={h.copyAllHint}
                          onClick={() => setDays((all) => all.map((x) => (x.open ? { ...x, ranges: day.ranges.map((y) => ({ ...y })) } : x)))}
                        >
                          <Copy />
                        </Button>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="flex h-9 items-center text-sm text-muted-foreground">{h.closed}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
