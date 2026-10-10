import "server-only";
import { aiThemeCore, AiUnavailableError } from "./ai";
import { collectSignals, heuristicCore } from "./extract";
import { buildTheme, googleFontsHref, type DetectThemeResult, type Theme } from "./index";

/** Drops web fonts Google Fonts doesn't serve (e.g. proprietary brand fonts). */
async function verifyFonts(theme: Theme): Promise<Theme> {
  const href = googleFontsHref(theme.googleFonts);
  if (!href) return theme;
  const ok = await fetch(href, { method: "HEAD", signal: AbortSignal.timeout(3000) })
    .then((r) => r.ok)
    .catch(() => false);
  if (ok) return theme;
  return { ...theme, googleFonts: [], fontFamily: buildTheme({}).fontFamily };
}

export function normalizeInputUrl(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return /^(localhost|127\.0\.0\.1)(:|\/|$)/.test(trimmed) ? `http://${trimmed}` : `https://${trimmed}`;
}

/** `allowAi: false` (e.g. the daily AI budget is spent) returns the heuristic theme without calling the model. */
export async function detectTheme(input: string, { allowAi = true } = {}): Promise<DetectThemeResult> {
  const signals = await collectSignals(normalizeInputUrl(input));
  const heuristic = heuristicCore(signals);
  const summary = {
    url: signals.url,
    title: signals.title,
    themeColor: signals.themeColor,
    colors: signals.colors.slice(0, 12),
    fonts: signals.fonts.slice(0, 5),
    googleFonts: signals.googleFonts,
    radii: signals.radii,
  };

  try {
    if (!allowAi) throw new AiUnavailableError("AI theming is busy right now; used heuristics instead.");
    const { core, rationale } = await aiThemeCore(signals, heuristic);
    return { theme: await verifyFonts(buildTheme(core)), source: "ai", rationale, signals: summary };
  } catch (err) {
    const aiNote =
      err instanceof AiUnavailableError
        ? err.message
        : "AI theming failed; used heuristics instead.";
    if (!(err instanceof AiUnavailableError)) console.error("[theme] AI error", err);
    return {
      theme: await verifyFonts(buildTheme(heuristic)),
      source: "heuristic",
      rationale: "Picked from the site's body styles, button colors, theme-color and most-used fonts.",
      signals: summary,
      aiNote,
    };
  }
}
