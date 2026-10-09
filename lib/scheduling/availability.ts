// Pure availability engine: no I/O, so it's deterministic and unit-testable.
// All instants are epoch milliseconds; wall-clock rules are interpreted in the
// business timezone.

import { addDays, dateInZone, timeOf, weekday, zonedToUtc } from "./time";

export type WeeklyInterval = { weekday: number; startMin: number; endMin: number };
/** Half-open [start, end) in epoch ms. */
export type Range = { start: number; end: number };

export type ProviderInput = {
  id: string;
  weekly: WeeklyInterval[];
  timeOff: Range[];
  /** Existing appointments, already extended by their buffer. */
  busy: Range[];
};

export type AvailabilityInput = {
  timezone: string;
  /** First local date to compute (YYYY-MM-DD). */
  fromDate: string;
  days: number;
  now: number;
  durationMin: number;
  bufferMin: number;
  slotIntervalMin: number;
  leadMinutes: number;
  horizonDays: number;
  /** Business-wide closures. */
  closures: Range[];
  providers: ProviderInput[];
};

export type Slot = { start: string; providerIds: string[] };
export type DayAvailability = { date: string; open: boolean; slots: Slot[] };

const MIN = 60_000;

export function overlaps(a: Range, b: Range): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Removes every `cut` range from `base`, returning the remaining pieces in order. */
export function subtractRanges(base: Range[], cut: Range[]): Range[] {
  let result = [...base].sort((a, b) => a.start - b.start);
  for (const c of cut) {
    const next: Range[] = [];
    for (const r of result) {
      if (!overlaps(r, c)) {
        next.push(r);
        continue;
      }
      if (c.start > r.start) next.push({ start: r.start, end: c.start });
      if (c.end < r.end) next.push({ start: c.end, end: r.end });
    }
    result = next;
  }
  return result;
}

/** A provider's bookable working time on a local date, minus absences and closures. */
export function workingRanges(
  provider: Pick<ProviderInput, "weekly" | "timeOff">,
  date: string,
  timezone: string,
  closures: Range[],
): Range[] {
  const wd = weekday(date);
  const base = provider.weekly
    .filter((w) => w.weekday === wd && w.endMin > w.startMin)
    .map((w) => ({
      start: zonedToUtc(date, timeOf(w.startMin), timezone).getTime(),
      // 24:00 is a valid closing time; roll into the next local day.
      end: (w.endMin >= 1440
        ? zonedToUtc(addDays(date, 1), timeOf(w.endMin - 1440), timezone)
        : zonedToUtc(date, timeOf(w.endMin), timezone)
      ).getTime(),
    }));
  return subtractRanges(base, [...provider.timeOff, ...closures]);
}

export function computeAvailability(input: AvailabilityInput): DayAvailability[] {
  const { timezone, durationMin, bufferMin } = input;
  const duration = durationMin * MIN;
  const step = Math.max(5, input.slotIntervalMin) * MIN;
  const earliest = input.now + input.leadMinutes * MIN;
  const today = dateInZone(new Date(input.now), timezone);
  const horizonEnd = zonedToUtc(addDays(today, input.horizonDays), "00:00", timezone).getTime();

  const days: DayAvailability[] = [];
  for (let i = 0; i < input.days; i++) {
    const date = addDays(input.fromDate, i);
    const byStart = new Map<number, string[]>();
    let open = false;

    for (const provider of input.providers) {
      const ranges = workingRanges(provider, date, timezone, input.closures);
      if (ranges.length) open = true;
      for (const range of ranges) {
        for (let t = range.start; t + duration <= range.end; t += step) {
          if (t < earliest) continue;
          if (t >= horizonEnd) break;
          const block = { start: t, end: t + duration + bufferMin * MIN };
          if (provider.busy.some((b) => overlaps(block, b))) continue;
          const list = byStart.get(t);
          if (list) list.push(provider.id);
          else byStart.set(t, [provider.id]);
        }
      }
    }

    const slots = [...byStart.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([start, providerIds]) => ({ start: new Date(start).toISOString(), providerIds }));
    days.push({ date, open, slots });
  }
  return days;
}

/** Among providers free for a slot, prefer the least busy that day, then list order. */
export function pickProvider(candidates: string[], dayLoad: Map<string, number>, order: string[]): string | null {
  if (!candidates.length) return null;
  return [...candidates].sort(
    (a, b) => (dayLoad.get(a) ?? 0) - (dayLoad.get(b) ?? 0) || order.indexOf(a) - order.indexOf(b),
  )[0];
}
