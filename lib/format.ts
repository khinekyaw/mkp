import type { BookingStatus } from "./db/schema";

// Dashboard formatting (English UI, business timezone).

export function fmtTime(date: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(date));
}

export function fmtDate(date: Date | string, timeZone: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone }).format(new Date(date));
}

/** Formats a YYYY-MM-DD local date without timezone shifts. */
export function fmtLocalDate(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function fmtMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function fmtClock(minutes: number) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Formats weekly intervals for one day as "9:00–12:00 · 13:00–17:00". */
export function formatHours(intervals: { startMin: number; endMin: number }[]) {
  if (!intervals.length) return null;
  const t = (m: number) => `${Math.floor(m / 60) % 24 || (m >= 1440 ? 24 : 0)}:${String(m % 60).padStart(2, "0")}`;
  return [...intervals]
    .sort((a, b) => a.startMin - b.startMin)
    .map((i) => `${t(i.startMin)}–${t(i.endMin)}`)
    .join(" · ");
}

export function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const SOURCE_LABEL = { widget: "Website", page: "Booking page", dashboard: "Staff" } as const;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
