import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("unifies Myanmar formats", () => {
    expect(normalizePhone("09 123 456 789")).toBe("959123456789");
    expect(normalizePhone("+95 9 123 456 789")).toBe("959123456789");
    expect(normalizePhone("0095-9-123456789")).toBe("959123456789");
  });
  it("keeps other numbers as digits", () => {
    expect(normalizePhone("+66 81 234 5678")).toBe("66812345678");
  });
});
