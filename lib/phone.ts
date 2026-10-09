/**
 * Canonical phone key used to recognize returning customers.
 * Myanmar numbers are written as 09…, +959… or 959…; all map to 959….
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (/^09\d{7,10}$/.test(digits)) return `95${digits.slice(1)}`;
  if (/^0095\d+$/.test(digits)) return digits.slice(2);
  return digits;
}

/** A stored (normalized) phone shown the way people write it: 959… → 09…, else +…. */
export function displayPhone(stored: string): string {
  return /^959\d{7,9}$/.test(stored) ? `0${stored.slice(2)}` : `+${stored}`;
}

export const PHONE_PATTERN = /^\+?[\d\s()-]{6,20}$/;
