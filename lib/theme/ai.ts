import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import type { ThemeCore } from "./index";
import type { SiteSignals } from "./extract";

// xAI (Grok) via its OpenAI-compatible API.
const XAI_BASE_URL = "https://api.x.ai/v1";
// Non-reasoning: theming is a short judgment call and the user is waiting on it.
const MODEL = process.env.XAI_MODEL || "grok-4.20-0309-non-reasoning";

const AiThemeSchema = z.object({
  siteName: z.string(),
  background: z.string(),
  foreground: z.string(),
  primary: z.string(),
  fontFamily: z.string(),
  radius: z.number(),
  rationale: z.string(),
});

/** Strict JSON schema sent as response_format; mirrors AiThemeSchema. */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    siteName: { type: "string", description: "Short business/brand name for the widget header" },
    background: { type: "string", description: "Widget background, #rrggbb" },
    foreground: { type: "string", description: "Main text color, #rrggbb" },
    primary: { type: "string", description: "Brand color for buttons and the selected time slot, #rrggbb" },
    fontFamily: { type: "string", description: "Single font family name, no fallbacks, e.g. Inter" },
    radius: { type: "number", description: "Corner radius in px between 0 and 20 (20 renders pill buttons)" },
    rationale: { type: "string", description: "One or two sentences explaining the choices, citing the evidence" },
  },
  required: ["siteName", "background", "foreground", "primary", "fontFamily", "radius", "rationale"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a brand designer configuring an embeddable appointment-booking widget so it looks like a native part of a business's website rather than a third-party tool.

You receive styling evidence scraped from the site's HTML and CSS: color usage counts (button colors are weighted higher), CSS custom properties, the <meta name="theme-color">, font-family usage, Google Fonts links, border-radius usage, body styles, and a deterministic heuristic guess.

Choose the widget's core theme:
- background/foreground should match the area of the page where an embed would sit (usually the main body), not a hero banner.
- primary is the brand's call-to-action color. Prefer colors used on buttons, brand-named CSS variables, or theme-color. Ignore colors that are clearly from third-party embeds, syntax highlighting, social icons, or error/success states. If the brand is genuinely monochrome, use the foreground color.
- fontFamily is the site's body/UI font. Undo build-tool name mangling (e.g. "__Inter_abc123" is Inter).
- radius should echo the site's buttons and inputs.

When evidence is thin, stay close to the heuristic guess. Keep text readable against the background. Reply with JSON only.`;

export class AiUnavailableError extends Error {}

export async function aiThemeCore(
  signals: SiteSignals,
  heuristic: ThemeCore,
): Promise<{ core: ThemeCore; rationale: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new AiUnavailableError("Set XAI_API_KEY to enable AI theming.");

  const client = new OpenAI({ apiKey, baseURL: XAI_BASE_URL, timeout: 45_000, maxRetries: 1 });
  const evidence = {
    url: signals.url,
    title: signals.title,
    siteName: signals.siteName,
    themeColor: signals.themeColor,
    body: signals.body,
    buttons: signals.buttons,
    colors: signals.colors,
    cssVariables: signals.cssVariables,
    fonts: signals.fonts,
    googleFonts: signals.googleFonts,
    radii: signals.radii,
    heuristicGuess: heuristic,
  };

  let content: string | null | undefined;
  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Styling evidence for ${signals.url}:\n\n${JSON.stringify(evidence, null, 1)}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "widget_theme", strict: true, schema: RESPONSE_SCHEMA },
      },
    });
    content = completion.choices[0]?.message?.content;
  } catch (err) {
    if (err instanceof OpenAI.AuthenticationError || err instanceof OpenAI.PermissionDeniedError) {
      throw new AiUnavailableError("Set a valid XAI_API_KEY to enable AI theming.");
    }
    if (err instanceof OpenAI.RateLimitError) {
      throw new AiUnavailableError("AI theming is rate limited right now; used heuristics instead.");
    }
    if (err instanceof OpenAI.APIConnectionError) {
      throw new AiUnavailableError("Couldn't reach the AI service; used heuristics instead.");
    }
    if (err instanceof OpenAI.APIError) {
      throw new AiUnavailableError(`AI theming failed (${err.status ?? "error"}); used heuristics instead.`);
    }
    throw err;
  }

  // Validate rather than trust: strict mode is best-effort for some schema features.
  let parsed: z.infer<typeof AiThemeSchema>;
  try {
    parsed = AiThemeSchema.parse(JSON.parse(content ?? ""));
  } catch {
    throw new Error("The model returned an unexpected format.");
  }

  return {
    core: {
      name: parsed.siteName || heuristic.name,
      background: parsed.background,
      foreground: parsed.foreground,
      primary: parsed.primary,
      fontFamily: parsed.fontFamily,
      radius: parsed.radius,
    },
    rationale: parsed.rationale,
  };
}
