import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { readThemeCache, themeCacheKey, writeThemeCache } from "@/lib/theme/cache";
import { detectTheme } from "@/lib/theme/detect";
import { FetchError } from "@/lib/theme/safe-fetch";

export const maxDuration = 60;

const bodySchema = z.object({ url: z.string().min(3).max(2048) });

const TEN_MIN = 10 * 60_000;
/** Model calls per UTC day across the platform; past it, detection falls back to heuristics. */
const DAILY_AI_LIMIT = Number(process.env.THEME_AI_DAILY_LIMIT) || 300;

export async function POST(request: Request) {
  // Each detection fetches a third-party site and may call the paid AI model:
  // signed-in clinics get a working allowance, the public landing demo a small one.
  const session = await auth.api.getSession({ headers: await headers() });
  const limited = session
    ? await rateLimit(`theme:user:${session.user.id}`, { limit: 30, windowMs: TEN_MIN })
    : await rateLimit(`theme:ip:${clientIp(request)}`, { limit: 5, windowMs: TEN_MIN });
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Enter a website URL." }, { status: 400 });
  }

  const key = themeCacheKey(parsed.data.url);
  const cached = key ? await readThemeCache(key) : null;
  if (cached) return Response.json(cached);

  try {
    const day = new Date().toISOString().slice(0, 10);
    const budget = await rateLimit(`theme:ai:${day}`, { limit: DAILY_AI_LIMIT, windowMs: 24 * 60 * 60_000 });
    const result = await detectTheme(parsed.data.url, { allowAi: budget.ok });
    // Only model results are worth keeping; a heuristic fallback deserves another try later.
    if (key && result.source === "ai") await writeThemeCache(key, result);
    return Response.json(result);
  } catch (err) {
    if (err instanceof FetchError || err instanceof TypeError) {
      return Response.json(
        { error: err instanceof FetchError ? err.message : "That doesn't look like a valid URL." },
        { status: 422 },
      );
    }
    console.error("[theme] detection failed", err);
    return Response.json({ error: "Something went wrong reading that site." }, { status: 500 });
  }
}
