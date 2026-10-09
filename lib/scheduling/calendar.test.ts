import { describe, expect, it } from "vitest";
import { calendarRange, mondayOf, monthStart } from "./calendar";

describe("calendar ranges", () => {
  it("finds the Monday of a week", () => {
    expect(mondayOf("2026-10-10")).toBe("2026-10-05"); // Saturday
    expect(mondayOf("2026-10-05")).toBe("2026-10-05"); // Monday itself
    expect(mondayOf("2026-10-11")).toBe("2026-10-05"); // Sunday belongs to the week before
  });

  it("steps months across year ends", () => {
    expect(monthStart("2026-12-15", 1)).toBe("2027-01-01");
    expect(monthStart("2026-01-31", -1)).toBe("2025-12-01");
  });

  it("covers a day, a week and a six-week month grid", () => {
    expect(calendarRange("day", "2026-10-10")).toEqual({ dates: ["2026-10-10"], prev: "2026-10-09", next: "2026-10-11" });
    const week = calendarRange("week", "2026-10-10");
    expect(week.dates[0]).toBe("2026-10-05");
    expect(week.dates).toHaveLength(7);
    expect(week.prev).toBe("2026-10-03");
    const month = calendarRange("month", "2026-10-10");
    expect(month.dates).toHaveLength(42);
    expect(month.dates[0]).toBe("2026-09-28");
    expect(month).toMatchObject({ prev: "2026-09-01", next: "2026-11-01" });
  });
});
