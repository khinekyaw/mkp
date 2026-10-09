import { addDays, weekday } from "./time";

export type CalendarView = "day" | "week" | "month";
export const CALENDAR_VIEWS: CalendarView[] = ["day", "week", "month"];

/** Monday on or before `date` (weeks start on Monday, like the hours editor). */
export function mondayOf(date: string): string {
  return addDays(date, -((weekday(date) + 6) % 7));
}

/** First day of the month `delta` months from `date`'s month. */
export function monthStart(date: string, delta = 0): string {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 10);
}

/**
 * The dates a calendar view shows for `date`, plus where previous/next go:
 * one day, the Monday-first week, or the six-week grid around the month.
 */
export function calendarRange(view: CalendarView, date: string): { dates: string[]; prev: string; next: string } {
  const r =
    view === "day"
      ? { from: date, days: 1, prev: addDays(date, -1), next: addDays(date, 1) }
      : view === "week"
        ? { from: mondayOf(date), days: 7, prev: addDays(date, -7), next: addDays(date, 7) }
        : { from: mondayOf(monthStart(date)), days: 42, prev: monthStart(date, -1), next: monthStart(date, 1) };
  return { dates: Array.from({ length: r.days }, (_, i) => addDays(r.from, i)), prev: r.prev, next: r.next };
}
