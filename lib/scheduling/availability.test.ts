import { describe, expect, it } from "vitest";
import { computeAvailability, pickProvider, subtractRanges, type AvailabilityInput } from "./availability";
import { zonedToUtc } from "./time";

const TZ = "Asia/Yangon"; // UTC+06:30, no DST
const at = (date: string, time: string) => zonedToUtc(date, time, TZ).getTime();
const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

// 2026-10-12 is a Monday.
const MON = "2026-10-12";
const weekdays9to5 = [1, 2, 3, 4, 5].flatMap((weekday) => [
  { weekday, startMin: 9 * 60, endMin: 12 * 60 },
  { weekday, startMin: 13 * 60, endMin: 17 * 60 },
]);

function input(overrides: Partial<AvailabilityInput> = {}): AvailabilityInput {
  return {
    timezone: TZ,
    fromDate: MON,
    days: 1,
    now: at("2026-10-11", "08:00"),
    durationMin: 30,
    bufferMin: 0,
    slotIntervalMin: 30,
    leadMinutes: 0,
    horizonDays: 30,
    closures: [],
    providers: [{ id: "a", weekly: weekdays9to5, timeOff: [], busy: [] }],
    ...overrides,
  };
}

describe("time", () => {
  it("converts Yangon wall time to UTC", () => {
    expect(zonedToUtc(MON, "09:00", TZ).toISOString()).toBe("2026-10-12T02:30:00.000Z");
  });
  it("handles DST zones", () => {
    // New York: EDT (UTC-4) in October, EST (UTC-5) in December.
    expect(zonedToUtc("2026-10-12", "09:00", "America/New_York").toISOString()).toBe("2026-10-12T13:00:00.000Z");
    expect(zonedToUtc("2026-12-14", "09:00", "America/New_York").toISOString()).toBe("2026-12-14T14:00:00.000Z");
  });
});

describe("subtractRanges", () => {
  it("splits and trims ranges", () => {
    expect(subtractRanges([{ start: 0, end: 100 }], [{ start: 20, end: 30 }, { start: 90, end: 120 }])).toEqual([
      { start: 0, end: 20 },
      { start: 30, end: 90 },
    ]);
  });
});

describe("computeAvailability", () => {
  it("generates slots around the lunch break", () => {
    const [day] = computeAvailability(input());
    expect(day.open).toBe(true);
    const times = day.slots.map((s) => hhmm(s.start));
    expect(times).toEqual([
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    ]);
  });

  it("marks closed weekdays", () => {
    const [sun] = computeAvailability(input({ fromDate: "2026-10-11" }));
    expect(sun).toMatchObject({ open: false, slots: [] });
  });

  it("only offers starts where the whole service fits", () => {
    const [day] = computeAvailability(input({ durationMin: 60 }));
    const times = day.slots.map((s) => hhmm(s.start));
    expect(times).toContain("11:00");
    expect(times).not.toContain("11:30");
    expect(times.at(-1)).toBe("16:00");
  });

  it("respects lead time", () => {
    const [day] = computeAvailability(input({ now: at(MON, "10:10"), leadMinutes: 60 }));
    expect(hhmm(day.slots[0].start)).toBe("11:30");
  });

  it("blocks existing bookings and their buffers", () => {
    const busy = [{ start: at(MON, "10:00"), end: at(MON, "10:45") }]; // 30 min + 15 buffer
    const [day] = computeAvailability(
      input({ providers: [{ id: "a", weekly: weekdays9to5, timeOff: [], busy }] }),
    );
    const times = day.slots.map((s) => hhmm(s.start));
    expect(times).not.toContain("10:00");
    expect(times).not.toContain("10:30");
    expect(times).toContain("11:00");
  });

  it("applies the new service's buffer before the next booking", () => {
    const busy = [{ start: at(MON, "10:00"), end: at(MON, "10:30") }];
    const [day] = computeAvailability(
      input({ bufferMin: 10, providers: [{ id: "a", weekly: weekdays9to5, timeOff: [], busy }] }),
    );
    // 09:30 + 30 min + 10 min buffer runs into 10:00.
    expect(day.slots.map((s) => hhmm(s.start))).not.toContain("09:30");
  });

  it("removes provider time off and business closures", () => {
    const timeOff = [{ start: at(MON, "13:00"), end: at(MON, "17:00") }];
    const closures = [{ start: at(MON, "09:00"), end: at(MON, "10:00") }];
    const [day] = computeAvailability(
      input({ closures, providers: [{ id: "a", weekly: weekdays9to5, timeOff, busy: [] }] }),
    );
    expect(day.slots.map((s) => hhmm(s.start))).toEqual(["10:00", "10:30", "11:00", "11:30"]);
  });

  it("merges providers and lists who is free", () => {
    const b = { id: "b", weekly: [{ weekday: 1, startMin: 12 * 60, endMin: 13 * 60 }], timeOff: [], busy: [] };
    const [day] = computeAvailability(
      input({ providers: [{ id: "a", weekly: weekdays9to5, timeOff: [], busy: [] }, b] }),
    );
    const noon = day.slots.find((s) => hhmm(s.start) === "12:00");
    expect(noon?.providerIds).toEqual(["b"]);
    expect(day.slots.find((s) => hhmm(s.start) === "09:00")?.providerIds).toEqual(["a"]);
  });

  it("stops at the booking horizon", () => {
    const days = computeAvailability(input({ fromDate: MON, days: 3, horizonDays: 2, now: at("2026-10-11", "08:00") }));
    // Horizon: today (Sun) + 2 days → Mon is bookable, Tue is not.
    expect(days[0].slots.length).toBeGreaterThan(0);
    expect(days[1].slots).toEqual([]);
  });
});

describe("pickProvider", () => {
  it("prefers the least busy provider, then list order", () => {
    expect(pickProvider(["a", "b"], new Map([["a", 3], ["b", 1]]), ["a", "b"])).toBe("b");
    expect(pickProvider(["a", "b"], new Map(), ["b", "a"])).toBe("b");
    expect(pickProvider([], new Map(), [])).toBeNull();
  });
});
