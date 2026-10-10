import { ZawgyiConverter, ZawgyiDetector } from "myanmar-tools";

// Many phones in Myanmar still type Zawgyi, which looks right on the sender's
// device but garbles everywhere else. Normalize patient-entered text to Unicode.

const detector = new ZawgyiDetector();
const converter = new ZawgyiConverter();

/** Above this the detector is confident; Google's guidance uses 0.95 for automatic conversion. */
const THRESHOLD = 0.95;

export function isZawgyi(text: string): boolean {
  return detector.getZawgyiProbability(text) > THRESHOLD;
}

export function toUnicode(text: string): string;
export function toUnicode(text: string | null | undefined): string | null | undefined;
export function toUnicode(text: string | null | undefined) {
  return text && isZawgyi(text) ? converter.zawgyiToUnicode(text) : text;
}
