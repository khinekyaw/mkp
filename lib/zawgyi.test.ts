import { describe, expect, it } from "vitest";
import { isZawgyi, toUnicode } from "./zawgyi";

describe("zawgyi", () => {
  it("converts Zawgyi to Unicode", () => {
    expect(toUnicode("ျမန္မာ")).toBe("မြန်မာ");
    expect(toUnicode("ေက်ာ္ေဇာ္")).toBe("ကျော်ဇော်");
  });

  it("leaves Unicode Burmese, Latin text and empty values alone", () => {
    expect(isZawgyi("မြန်မာ")).toBe(false);
    expect(toUnicode("ကျော်ဇော်")).toBe("ကျော်ဇော်");
    expect(toUnicode("Aye Aye Khaing")).toBe("Aye Aye Khaing");
    expect(toUnicode("")).toBe("");
    expect(toUnicode(null)).toBe(null);
  });
});
