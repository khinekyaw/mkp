import type { CSSProperties } from "react";
import { contrast, luminance, mix, normalizeHex, readableOn } from "./color";
import { themeSchema, type Theme } from "./schema";

export * from "./fonts";
export * from "./schema";

const SYSTEM_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, var(--font-myanmar), "Helvetica Neue", Arial, sans-serif';

/**
 * The look a widget has before a clinic applies its own brand: our own site's
 * theme (sage green on warm white, Archivo, soft 12px corners), i.e. the hex
 * equivalents of the app-look tokens in globals.css.
 */
export const DEFAULT_THEME: Theme = {
  name: "Sunrise Clinic",
  mode: "light",
  colors: {
    background: "#fdfdfb",
    foreground: "#161914",
    muted: "#f2f3f0",
    mutedForeground: "#6a6d66",
    border: "#e5e5e1",
    primary: "#5f7c47",
    primaryForeground: "#ffffff",
  },
  fontFamily: `"Archivo", ${SYSTEM_STACK}`,
  googleFonts: ["Archivo"],
  radius: 12,
};

const SYSTEM_FONTS = new Set(
  [
    "arial",
    "helvetica",
    "helvetica neue",
    "system-ui",
    "-apple-system",
    "blinkmacsystemfont",
    "segoe ui",
    "roboto", // ships with Android/ChromeOS; still loadable from Google if missing
    "georgia",
    "times",
    "times new roman",
    "verdana",
    "tahoma",
    "trebuchet ms",
    "courier new",
    "ui-sans-serif",
    "ui-serif",
    "ui-monospace",
    "sans-serif",
    "serif",
    "monospace",
    "inherit",
  ].map((f) => f.toLowerCase()),
);

export function isSystemFont(family: string): boolean {
  return SYSTEM_FONTS.has(family.trim().toLowerCase());
}

// Self-hosted builds of Google fonts often go by a different name.
const GOOGLE_ALIASES: Record<string, string> = {
  geistsans: "Geist",
  geistmono: "Geist Mono",
  "geist sans": "Geist",
};

/** Maps a site's font name to the Google Fonts family that most likely serves it. */
export function googleFamilyFor(family: string): string {
  const clean = family.replace(/["']/g, "").trim();
  return GOOGLE_ALIASES[clean.toLowerCase()] ?? clean.replace(/\s+(Variable|VF|Var)$/i, "");
}

/** Builds a CSS font-family stack with a sensible fallback for a primary family. */
export function fontStack(family: string | null | undefined): string {
  if (!family) return SYSTEM_STACK;
  const clean = family.replace(/["']/g, "").trim();
  if (!clean) return SYSTEM_STACK;
  return `"${clean}", ${SYSTEM_STACK}`;
}

export type ThemeCore = {
  name?: string;
  background?: string | null;
  foreground?: string | null;
  primary?: string | null;
  fontFamily?: string | null;
  radius?: number | null;
};

/**
 * Turns a handful of core brand decisions into a complete, accessible palette.
 * Derived tokens (muted, border…) are mixed from background/foreground so they
 * always harmonize, and text colors are corrected when contrast is too low.
 */
export function buildTheme(core: ThemeCore): Theme {
  const background = normalizeHex(core.background) ?? DEFAULT_THEME.colors.background;
  const isDark = luminance(background) < 0.4;

  let foreground = normalizeHex(core.foreground) ?? readableOn(background);
  if (contrast(background, foreground) < 4.5) foreground = readableOn(background);

  let primary = normalizeHex(core.primary) ?? foreground;
  // A primary that disappears into the background is useless for buttons.
  if (contrast(background, primary) < 1.6) primary = foreground;

  const raw = core.fontFamily?.replace(/["']/g, "").trim();
  const family = raw ? (isSystemFont(raw) ? raw : googleFamilyFor(raw)) : null;
  const loadable = family && !isSystemFont(family) ? [family] : [];

  return themeSchema.parse({
    name: core.name?.slice(0, 80) || undefined,
    mode: isDark ? "dark" : "light",
    colors: {
      background,
      foreground,
      muted: mix(background, foreground, isDark ? 0.1 : 0.045),
      mutedForeground: mix(background, foreground, isDark ? 0.6 : 0.55),
      border: mix(background, foreground, isDark ? 0.18 : 0.12),
      primary,
      primaryForeground: readableOn(primary),
    },
    fontFamily: family ? fontStack(family) : SYSTEM_STACK,
    googleFonts: loadable,
    radius: Math.round(Math.min(24, Math.max(0, core.radius ?? DEFAULT_THEME.radius))),
  });
}

/** Overrides the design tokens from globals.css for a subtree. */
export function themeToCssVars(theme: Theme): CSSProperties {
  const c = theme.colors;
  return {
    "--background": c.background,
    "--foreground": c.foreground,
    "--muted": c.muted,
    "--muted-foreground": c.mutedForeground,
    "--border": c.border,
    "--primary": c.primary,
    "--primary-foreground": c.primaryForeground,
    "--radius": `${theme.radius}px`,
    "--font": theme.fontFamily,
    "--selection": c.primary,
    "--selection-ink": c.primaryForeground,
    caretColor: c.primary,
    accentColor: c.primary,
    colorScheme: theme.mode,
  } as CSSProperties;
}

export function googleFontsHref(families: string[]): string | null {
  if (!families.length) return null;
  const params = families
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

// --- URL-safe encoding so a theme can travel in an embed snippet / query string.

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): string {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeTheme(theme: Theme): string {
  return toBase64Url(JSON.stringify(theme));
}

export function decodeTheme(encoded: string | null | undefined): Theme | null {
  if (!encoded) return null;
  try {
    const result = themeSchema.safeParse(JSON.parse(fromBase64Url(encoded)));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
