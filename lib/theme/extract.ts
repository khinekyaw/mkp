import "server-only";
import * as cheerio from "cheerio";
import { chroma, contrast, isNearNeutral, luminance, normalizeHex } from "./color";
import { safeFetchText } from "./safe-fetch";
import type { SiteSignalsSummary } from "./schema";

/** Everything we learned about a site's styling, richer than what the UI shows. */
export type SiteSignals = SiteSignalsSummary & {
  siteName: string | null;
  body: { background: string | null; color: string | null; font: string | null };
  buttons: { background: string | null; color: string | null; radius: number | null }[];
  cssVariables: { name: string; value: string }[];
};

const MAX_STYLESHEETS = 16;
// Global/token stylesheets are the most informative; fetch those first.
const LIKELY_GLOBAL_SHEET = /layout|global|main|app|style|theme|base|index|root|common|bundle|site/i;
const COLOR_TOKEN = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)/gi;
const COLOR_PROPS = /^(color|background|background-color|border(-\w+)?-color|border|fill|stroke|outline-color|--.+)$/;
const ICON_FONT = /icon|awesome|material|glyph|symbol|emoji/i;
const GENERIC_FONT = /^(inherit|initial|unset|sans-serif|serif|monospace|system-ui|ui-sans-serif|-apple-system|blinkmacsystemfont|var\(.*)$/i;

class Counter<K> extends Map<K, number> {
  add(key: K, by = 1) {
    this.set(key, (this.get(key) ?? 0) + by);
  }
  top(n: number) {
    return [...this.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  }
}

/** Next.js self-hosted fonts look like `__Inter_d65c78`; recover the real name. */
function cleanFontName(raw: string): string | null {
  let name = raw.replace(/["']/g, "").trim();
  if (!name || GENERIC_FONT.test(name) || ICON_FONT.test(name)) return null;
  const next = name.match(/^__(.+?)_[0-9a-f]{5,8}$/i);
  if (next) name = next[1].replace(/_/g, " ");
  if (/fallback/i.test(name) || !/^[\p{L}][\p{L}\p{N} _-]{0,40}$/u.test(name)) return null;
  return name;
}

function firstFont(value: string): string | null {
  for (const part of value.split(",")) {
    const name = cleanFontName(part);
    if (name) return name;
  }
  return null;
}

function toPx(value: string): number | null {
  const m = value.trim().match(/^(-?[\d.]+)(px|rem|em)?/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (Number.isNaN(n)) return null;
  return m[2] === "rem" || m[2] === "em" ? n * 16 : n;
}

function googleFamiliesFromUrl(href: string): string[] {
  try {
    const url = new URL(href, "https://fonts.googleapis.com");
    if (!url.hostname.includes("fonts.googleapis.com")) return [];
    return url.searchParams
      .getAll("family")
      .flatMap((f) => f.split("|"))
      .map((f) => f.split(":")[0].replace(/\+/g, " ").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

type Rule = { selector: string; decls: [string, string][] };

function parseRules(css: string): Rule[] {
  const rules: Rule[] = [];
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // Matches innermost `selector { decls }` blocks; good enough for at-rules too.
  for (const m of cleaned.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    if (selector.startsWith("@font-face") || selector.startsWith("@keyframes")) continue;
    const decls = m[2]
      .split(";")
      .map((d) => {
        const i = d.indexOf(":");
        return i > 0
          ? ([d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).replace(/!important/, "").trim()] as [string, string])
          : null;
      })
      .filter((d): d is [string, string] => !!d && !!d[1]);
    rules.push({ selector, decls });
  }
  return rules;
}

export async function collectSignals(rawUrl: string): Promise<SiteSignals> {
  const { text: html, finalUrl } = await safeFetchText(rawUrl);
  const $ = cheerio.load(html);

  const cssChunks: string[] = [];
  $("style").each((_, el) => {
    cssChunks.push($(el).text());
  });

  const inlineStyles: string[] = [];
  $("[style]").each((_, el) => {
    inlineStyles.push($(el).attr("style") ?? "");
  });
  if (inlineStyles.length) cssChunks.push(`.__inline{${inlineStyles.join(";")}}`);

  const googleFonts = new Set<string>();
  const sheetUrls = new Map<string, URL>();
  $('link[rel~="stylesheet"], link[as="style"]').each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    googleFamiliesFromUrl(href).forEach((f) => googleFonts.add(f));
    try {
      const u = new URL(href, finalUrl);
      if (!u.hostname.includes("fonts.googleapis.com")) sheetUrls.set(u.href, u);
    } catch {}
  });

  const sheets = await Promise.allSettled(
    [...sheetUrls.values()]
      .map((u, i) => ({ u, score: (LIKELY_GLOBAL_SHEET.test(u.pathname) ? 0 : 1000) + i }))
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_STYLESHEETS)
      .map(({ u }) =>
      safeFetchText(u, { maxBytes: 800_000, accept: "text/css,*/*" }),
    ),
  );
  for (const s of sheets) if (s.status === "fulfilled") cssChunks.push(s.value.text);

  const css = cssChunks.join("\n");
  for (const m of css.matchAll(/@import\s+(?:url\()?["']?([^"')\s;]+)/g)) {
    googleFamiliesFromUrl(m[1]).forEach((f) => googleFonts.add(f));
  }

  const rules = parseRules(css);

  // Sites with light/dark themes scope tokens like `[data-theme=dark]` or
  // `.dark`; prefer definitions matching what the page's <html> declares.
  const root = $("html");
  const rootHints = [root.attr("data-theme"), root.attr("data-color-mode"), ...(root.attr("class") ?? "").split(/\s+/)]
    .map((h) => h?.trim().toLowerCase())
    .filter((h): h is string => !!h && /dark|light/.test(h));
  const varPriority = (selector: string) => {
    const sel = selector.toLowerCase();
    if (rootHints.some((h) => sel.includes(h))) return 2;
    if (/dark|light/.test(sel)) return -1;
    return /(^|[\s,])(html|body|:root)/.test(sel) ? 1 : 0;
  };

  // Pass 1: custom properties, so `var(--brand)` usages can be resolved.
  const vars = new Map<string, { value: string; priority: number }>();
  for (const r of rules) {
    const priority = varPriority(r.selector);
    for (const [prop, value] of r.decls) {
      if (!prop.startsWith("--")) continue;
      const prev = vars.get(prop);
      if (!prev || priority > prev.priority) vars.set(prop, { value, priority });
    }
  }
  const resolve = (value: string, depth = 0): string =>
    depth > 4
      ? value
      : value.replace(/var\((--[\w-]+)(?:,\s*([^)]+))?\)/g, (_, name: string, fallback?: string) =>
          resolve(vars.get(name)?.value ?? fallback ?? "", depth + 1),
        );
  // Tailwind/shadcn sites often store bare HSL/RGB channels: `--primary: 222 47% 11%`.
  const asColor = (value: string): string | null => {
    const v = resolve(value).trim();
    const direct = normalizeHex(v);
    if (direct) return direct;
    if (/^[\d.]+\s+[\d.]+%\s+[\d.]+%$/.test(v)) return normalizeHex(`hsl(${v})`);
    return null;
  };

  const colors = new Counter<string>();
  const fonts = new Counter<string>();
  const radii = new Counter<number>();
  const body: SiteSignals["body"] = { background: null, color: null, font: null };
  const buttons: SiteSignals["buttons"] = [];

  for (const r of rules) {
    const sel = r.selector.toLowerCase();
    const isBody = sel.split(",").some((part) => /^(html|body|:root)$/.test(part.trim()));
    const isButton = /button|\.btn|cta|\[type=.?submit/.test(sel) && !/:(hover|focus|active|disabled)/.test(sel);
    const btn: SiteSignals["buttons"][number] = { background: null, color: null, radius: null };

    for (const [prop, value] of r.decls) {
      if (COLOR_PROPS.test(prop) && !prop.startsWith("--")) {
        const resolved = resolve(value);
        for (const token of resolved.match(COLOR_TOKEN) ?? []) {
          const hex = normalizeHex(token);
          if (hex) colors.add(hex, isButton ? 6 : 1);
        }
        const single = asColor(value);
        if (isBody && single) {
          if (prop === "color") body.color ??= single;
          if (prop.startsWith("background")) body.background ??= single;
        }
        if (isButton && single) {
          if (prop === "color") btn.color = single;
          if (prop.startsWith("background")) btn.background = single;
        }
      } else if (prop === "font-family" || prop === "font") {
        const family = firstFont(resolve(value).replace(/^.*?\d+(px|rem|em|%)\S*\s+/, ""));
        if (family) {
          fonts.add(family, isBody ? 8 : 1);
          if (isBody) body.font ??= family;
        }
      } else if (prop === "border-radius") {
        const px = toPx(resolve(value));
        if (px !== null && px >= 0) {
          const v = px > 40 ? 9999 : Math.round(px);
          radii.add(v, isButton ? 4 : 1);
          if (isButton) btn.radius = v;
        }
      }
    }
    if (isButton && (btn.background || btn.radius !== null)) buttons.push(btn);
  }

  // Common design-token names are strong hints even when rarely used directly.
  const cssVariables: SiteSignals["cssVariables"] = [];
  for (const [name, { value }] of vars) {
    const hex = asColor(value);
    if (!hex) continue;
    if (/primary|brand|accent|main|theme|cta/i.test(name)) colors.add(hex, 10);
    if (cssVariables.length < 40) cssVariables.push({ name, value: hex });
  }

  const themeColor = normalizeHex($('meta[name="theme-color"]').first().attr("content"));
  if (themeColor) colors.add(themeColor, 15);

  return {
    url: finalUrl.toString(),
    title: $("title").first().text().trim().slice(0, 120) || null,
    siteName:
      $('meta[property="og:site_name"]').attr("content")?.trim() ||
      $('meta[name="application-name"]').attr("content")?.trim() ||
      null,
    themeColor,
    colors: colors.top(24).map(([hex, count]) => ({ hex, count })),
    fonts: fonts.top(8).map(([family, count]) => ({ family, count })),
    googleFonts: [...googleFonts].slice(0, 6),
    radii: radii.top(6).map(([px, count]) => ({ px, count })),
    body,
    buttons: buttons.slice(0, 12),
    cssVariables,
  };
}

/** Best-guess site name from metadata/title, e.g. "Acme Clinic | Home" → "Acme Clinic". */
export function guessName(signals: SiteSignals): string | undefined {
  if (signals.siteName) return signals.siteName.slice(0, 60);
  const t = signals.title?.split(/\s[|\-–—·:]\s/)[0]?.trim();
  return t ? t.slice(0, 60) : new URL(signals.url).hostname.replace(/^www\./, "");
}

/** Deterministic theme guess used without AI, and as the AI's fallback. */
export function heuristicCore(signals: SiteSignals) {
  // theme-color usually mirrors the page background when it's neutral.
  const background =
    signals.body.background ??
    (signals.themeColor && isNearNeutral(signals.themeColor) ? signals.themeColor : null) ??
    "#ffffff";

  // Without explicit body text color, use the most-used color that reads as text.
  const foreground =
    signals.body.color ?? signals.colors.find((c) => contrast(c.hex, background) >= 7)?.hex ?? null;

  // Colors are already weighted toward buttons, brand-named variables and
  // theme-color, so the top saturated color that can carry white/black text wins.
  const brand =
    signals.colors.find(
      (c) => chroma(c.hex) > 0.25 && contrast(c.hex, background) >= 2.2 && luminance(c.hex) < 0.75,
    )?.hex ?? null;

  const buttonRadius = signals.buttons.find((b) => b.radius !== null)?.radius;
  const radius = buttonRadius ?? signals.radii[0]?.px ?? 8;

  return {
    name: guessName(signals),
    background,
    foreground,
    primary: brand,
    fontFamily: signals.body.font ?? signals.fonts[0]?.family ?? null,
    radius: radius >= 9999 ? 20 : Math.min(radius, 20),
  };
}
