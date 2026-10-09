import { timingSafeEqual } from "node:crypto";

/** Compares secrets without leaking their contents through timing. */
export function constantTimeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
