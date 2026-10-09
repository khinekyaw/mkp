const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** URL-safe random id (lowercase alphanumeric). 16 chars ≈ 82 bits of entropy. */
export function newId(length = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** Secret token for capability URLs (e.g. a patient's manage-booking link). */
export function newToken(): string {
  return newId(32);
}

export function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || newId(8)
  );
}
