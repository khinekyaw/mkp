import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./queue", () => ({ enqueue: vi.fn() }));

const { reminderTime } = await import("./booking");

const now = new Date("2026-10-10T00:00:00Z");
const at = (hoursFromNow: number) => new Date(now.getTime() + hoursFromNow * 3_600_000);

describe("reminderTime", () => {
  it("reminds a day ahead when there's time", () => {
    expect(reminderTime(at(48), now)).toEqual(at(24));
  });

  it("falls back to two hours ahead for bookings inside the day", () => {
    expect(reminderTime(at(10), now)).toEqual(at(8));
  });

  it("skips reminders for appointments only a few hours away", () => {
    expect(reminderTime(at(2.5), now)).toBeNull();
  });
});
