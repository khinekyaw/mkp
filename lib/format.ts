import { dashEn, dashMy } from "./copy/dashboard";
import type { Locale } from "./i18n";

// Dashboard formatting in the business timezone.
//
// Burmese is composed by hand instead of through Intl: browsers ship different
// (or no) Burmese locale data, so Intl output differs between the server and
// the browser and breaks hydration. Burmese uses Burmese month and weekday names
// with Western digits and 24-hour time, ordered like ICU's `y MMMM d EEEE`.
const MY_MONTHS = ["ဇန်နဝါရီ", "ဖေဖော်ဝါရီ", "မတ်", "ဧပြီ", "မေ", "ဇွန်", "ဇူလိုင်", "ဩဂုတ်", "စက်တင်ဘာ", "အောက်တိုဘာ", "နိုဝင်ဘာ", "ဒီဇင်ဘာ"];
const MY_MONTHS_SHORT = ["ဇန်", "ဖေ", "မတ်", "ဧ", "မေ", "ဇွန်", "ဇူ", "ဩ", "စက်", "အောက်", "နို", "ဒီ"];

/** Calendar parts of an instant in `timeZone` (en-US data exists everywhere). */
function zonedParts(at: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const y = get("year");
  const m = get("month");
  const d = get("day");
  return { y, m, d, hour: get("hour"), minute: get("minute"), weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

function myDate(p: { y: number; m: number; d: number; weekday: number }, opts: Intl.DateTimeFormatOptions) {
  return [
    opts.year ? p.y : null,
    opts.month ? (opts.month === "long" ? MY_MONTHS : MY_MONTHS_SHORT)[p.m - 1] : null,
    opts.day ? p.d : null,
    opts.weekday ? (opts.weekday === "narrow" ? dashMy.weekdaysNarrow : dashMy.weekdays)[p.weekday] : null,
  ]
    .filter((x) => x !== null)
    .join(" ");
}

export function fmtTime(date: Date | string, timeZone: string, locale: Locale = "en") {
  if (locale === "my") {
    const p = zonedParts(new Date(date), timeZone);
    return `${p.hour}:${String(p.minute).padStart(2, "0")}`;
  }
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(date));
}

export function fmtDate(
  date: Date | string,
  timeZone: string,
  opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" },
  locale: Locale = "en",
) {
  if (locale === "my") return myDate(zonedParts(new Date(date), timeZone), opts);
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone }).format(new Date(date));
}

/** Formats a YYYY-MM-DD local date without timezone shifts. */
export function fmtLocalDate(date: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" }, locale: Locale = "en") {
  if (locale === "my") {
    const [y, m, d] = date.split("-").map(Number);
    return myDate({ y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay() }, opts);
  }
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function fmtMinutes(min: number, locale: Locale = "en") {
  const f = (locale === "my" ? dashMy : dashEn).fmt;
  if (min < 60) return f.min(min);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? f.hm(h, m) : f.h(h);
}

/** Minutes after midnight as a clock time ("9:30 AM", Burmese "9:30"). */
export function fmtClock(minutes: number, locale: Locale = "en") {
  return fmtTime(new Date(Date.UTC(2000, 0, 1, Math.floor(minutes / 60) % 24, minutes % 60)), "UTC", locale);
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

export function fmtMoney(amount: number, currency: string, locale: Locale = "en") {
  if (locale === "my") return `${amount.toLocaleString("en-US")} ${currency}`;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}
