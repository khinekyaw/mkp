import { describe, expect, it } from "vitest";
import { fmtClock, fmtDate, fmtLocalDate, fmtMinutes, fmtTime } from "./format";

// Burmese is hand-composed so server and browser always agree (hydration).
describe("Burmese formatting", () => {
  const at = new Date("2026-10-10T07:50:00Z"); // 14:20 in Asia/Yangon (+06:30)

  it("uses 24-hour time with Western digits", () => {
    expect(fmtTime(at, "Asia/Yangon", "my")).toBe("14:20");
    expect(fmtClock(9 * 60 + 5, "my")).toBe("9:05");
  });

  it("orders dates like ICU's y MMMM d EEEE", () => {
    expect(fmtLocalDate("2026-10-10", { weekday: "long", day: "numeric", month: "long", year: "numeric" }, "my")).toBe("2026 အောက်တိုဘာ 10 စနေ");
    expect(fmtDate(at, "Asia/Yangon", { month: "short", day: "numeric" }, "my")).toBe("အောက် 10");
  });

  it("keeps English on Intl", () => {
    expect(fmtTime(at, "Asia/Yangon")).toBe("2:20 PM");
    expect(fmtMinutes(90)).toBe("1 h 30 min");
    expect(fmtMinutes(90, "my")).toBe("1 နာရီ 30 မိနစ်");
  });
});
