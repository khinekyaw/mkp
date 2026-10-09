import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "Expected #rrggbb");

export const themeSchema = z.object({
  /** Business / site name shown in the widget header. */
  name: z.string().max(80).optional(),
  mode: z.enum(["light", "dark"]),
  colors: z.object({
    background: hex,
    foreground: hex,
    muted: hex,
    mutedForeground: hex,
    border: hex,
    primary: hex,
    primaryForeground: hex,
  }),
  /** CSS font-family stack. */
  fontFamily: z.string().max(200),
  /** Google Fonts families to load for the widget (may be empty). */
  googleFonts: z.array(z.string().max(60)).max(2),
  /** Corner radius in px. */
  radius: z.number().min(0).max(24),
});

export type Theme = z.infer<typeof themeSchema>;
export type ThemeColors = Theme["colors"];

export type ThemeSource = "ai" | "heuristic" | "default";

export type DetectThemeResult = {
  theme: Theme;
  source: ThemeSource;
  /** Short human-readable explanation of the choices made. */
  rationale: string;
  /** Raw evidence extracted from the site, for transparency in the UI. */
  signals: SiteSignalsSummary;
  /** Set when AI was attempted but unavailable, so the UI can say why. */
  aiNote?: string;
};

export type SiteSignalsSummary = {
  url: string;
  title: string | null;
  themeColor: string | null;
  colors: { hex: string; count: number }[];
  fonts: { family: string; count: number }[];
  googleFonts: string[];
  radii: { px: number; count: number }[];
};
