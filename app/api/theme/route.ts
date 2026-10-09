import { z } from "zod";
import { detectTheme } from "@/lib/theme/detect";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { FetchError } from "@/lib/theme/safe-fetch";

export const maxDuration = 60;

const bodySchema = z.object({ url: z.string().min(3).max(2048) });

export async function POST(request: Request) {
  // Each detection fetches a third-party site and may call the AI model.
  const limited = rateLimit(`theme:${clientIp(request)}`, { limit: 10, windowMs: 10 * 60_000 });
  if (!limited.ok) return tooManyRequests(limited.retryAfter);
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Enter a website URL." }, { status: 400 });
  }
  try {
    return Response.json(await detectTheme(parsed.data.url));
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
