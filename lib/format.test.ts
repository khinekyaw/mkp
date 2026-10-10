import { describe, expect, it } from "vitest";
import { fmtClock, fmtDate, fmtLocalDate, fmtMinutes, fmtTime, patientDate, patientDayLabels, patientLocalDate, patientTime } from "./format";
import { formatPrice } from "./i18n";

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

// Patients may not read AM/PM or English month abbreviations.
describe("patient formatting", () => {
  const morning = new Date("2026-10-13T02:30:00Z"); // 9:00 in Asia/Yangon
  const evening = new Date("2026-10-13T10:00:00Z"); // 16:30

  it("spells Burmese time with Burmese digits and a time-of-day word", () => {
    expect(patientTime(morning, "Asia/Yangon", "my")).toBe("မနက် ၉:၀၀");
    expect(patientTime(evening, "Asia/Yangon", "my")).toBe("ညနေ ၄:၃၀");
    expect(patientTime(new Date("2026-10-13T05:30:00Z"), "Asia/Yangon", "my")).toBe("နေ့လည် ၁၂:၀၀");
    expect(patientTime(new Date("2026-10-13T14:00:00Z"), "Asia/Yangon", "my")).toBe("ည ၈:၃၀");
    expect(patientTime(morning, "Asia/Yangon", "en")).toBe("9:00 AM");
  });

  it("spells Burmese dates in full", () => {
    expect(patientDate(morning, "Asia/Yangon", "my")).toBe("အောက်တိုဘာလ ၁၃ ရက်၊ အင်္ဂါနေ့");
    expect(patientDate(morning, "Asia/Yangon", "my", true)).toBe("၂၀၂၆ ခုနှစ်၊ အောက်တိုဘာလ ၁၃ ရက်၊ အင်္ဂါနေ့");
    expect(patientLocalDate("2026-10-13", "en")).toBe("Tuesday, October 13");
    expect(patientDayLabels("2026-10-13", "my")).toEqual({ weekday: "အင်္ဂါ", day: "၁၃", month: "အောက်တိုဘာ" });
    expect(patientDayLabels("2026-10-13", "en")).toEqual({ weekday: "Tue", day: "13", month: "Oct" });
  });
});

describe("patient prices", () => {
  it("writes kyat in Burmese digits and words", () => {
    expect(formatPrice(15000, "MMK", "my")).toBe("၁၅,၀၀၀ ကျပ်");
    expect(formatPrice(20, "USD", "my")).toBe("၂၀ USD");
  });
});
