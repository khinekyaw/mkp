// Minimal color utilities: parse CSS colors, measure contrast, mix.
// Kept dependency-free so it runs in the browser, on the server, and at the edge.

export type RGBA = { r: number; g: number; b: number; a: number };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function parseChannel(value: string, max: number): number {
  const v = value.trim();
  if (v.endsWith("%")) return (parseFloat(v) / 100) * max;
  return parseFloat(v);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

const NAMED: Record<string, string> = {
  white: "#ffffff",
  black: "#000000",
  red: "#ff0000",
  blue: "#0000ff",
  green: "#008000",
  gray: "#808080",
  grey: "#808080",
  navy: "#000080",
  teal: "#008080",
  orange: "#ffa500",
  purple: "#800080",
};

export function parseColor(input: string): RGBA | null {
  const str = input.trim().toLowerCase();
  if (NAMED[str]) return parseColor(NAMED[str]);

  const hex = str.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const n = parseInt(h, 16);
    return h.length === 6
      ? { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 }
      : { r: (n >>> 24) & 255, g: (n >> 16) & 255, b: (n >> 8) & 255, a: (n & 255) / 255 };
  }

  const fn = str.match(/^(rgba?|hsla?)\(([^)]+)\)$/);
  if (!fn) return null;
  // Supports both "1, 2, 3, .5" and "1 2 3 / 50%" syntaxes.
  const [main, alphaPart] = fn[2].split("/");
  const parts = main.split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const alphaRaw = alphaPart ?? parts[3];
  const a = alphaRaw === undefined ? 1 : clamp(parseChannel(alphaRaw, 1), 0, 1);

  if (fn[1].startsWith("rgb")) {
    const [r, g, b] = parts.slice(0, 3).map((p) => clamp(parseChannel(p, 255), 0, 255));
    if ([r, g, b].some(Number.isNaN)) return null;
    return { r, g, b, a };
  }
  const h = parseFloat(parts[0]);
  const s = clamp(parseFloat(parts[1]) / 100, 0, 1);
  const l = clamp(parseFloat(parts[2]) / 100, 0, 1);
  if ([h, s, l].some(Number.isNaN)) return null;
  const [r, g, b] = hslToRgb(((h % 360) + 360) % 360, s, l);
  return { r, g, b, a };
}

export function toHex({ r, g, b }: RGBA): string {
  return (
    "#" +
    [r, g, b]
      .map((c) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Normalizes any CSS color to #rrggbb, or null if unparseable/mostly transparent. */
export function normalizeHex(input: string | null | undefined): string | null {
  if (!input) return null;
  const c = parseColor(input);
  if (!c || c.a < 0.5) return null;
  return toHex(c);
}

export function luminance(hex: string): number {
  const c = parseColor(hex);
  if (!c) return 0;
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function saturation(hex: string): number {
  const c = parseColor(hex);
  if (!c) return 0;
  const max = Math.max(c.r, c.g, c.b) / 255;
  const min = Math.min(c.r, c.g, c.b) / 255;
  const l = (max + min) / 2;
  if (max === min) return 0;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

/** Linear mix in sRGB: t=0 returns a, t=1 returns b. */
export function mix(a: string, b: string, t: number): string {
  const ca = parseColor(a);
  const cb = parseColor(b);
  if (!ca || !cb) return a;
  return toHex({
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t,
    a: 1,
  });
}

export function readableOn(bg: string): string {
  return contrast(bg, "#ffffff") >= contrast(bg, "#0a0a0a") ? "#ffffff" : "#0a0a0a";
}

/** Colorfulness independent of lightness (0–1); unlike HSL saturation, dark navies score low. */
export function chroma(hex: string): number {
  const c = parseColor(hex);
  if (!c) return 0;
  return (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255;
}

export function isNearNeutral(hex: string): boolean {
  return chroma(hex) < 0.12;
}
