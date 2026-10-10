import "server-only";
import { lt, sql } from "drizzle-orm";
import { db, schema } from "./db";

// Fixed-window counters in Postgres, so every server instance shares them.
// One upsert per check: a new window starts when the stored one has expired.

export type LimitResult = { ok: boolean; retryAfter: number; count: number };

export async function rateLimit(key: string, { limit, windowMs }: { limit: number; windowMs: number }): Promise<LimitResult> {
  const now = new Date();
  const t = schema.throttle;
  const expired = sql`${t.resetAt} <= ${now.toISOString()}::timestamptz`;
  const [row] = await db
    .insert(t)
    .values({ key, count: 1, resetAt: new Date(now.getTime() + windowMs) })
    .onConflictDoUpdate({
      target: t.key,
      set: {
        count: sql`case when ${expired} then 1 else ${t.count} + 1 end`,
        resetAt: sql`case when ${expired} then excluded.reset_at else ${t.resetAt} end`,
      },
    })
    .returning({ count: t.count, resetAt: t.resetAt });
  const ok = row.count <= limit;
  return { ok, count: row.count, retryAfter: ok ? 0 : Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000)) };
}

/** Expired windows are dead weight; the maintenance job clears them. */
export async function purgeExpiredLimits() {
  await db.delete(schema.throttle).where(lt(schema.throttle.resetAt, new Date()));
}

/**
 * The client's IP as reported by the platform, never a value the client can choose.
 * - TRUSTED_IP_HEADER: a single-value header your edge sets (e.g. "cf-connecting-ip").
 * - On Vercel, x-real-ip is set by the platform from the connecting address.
 * - Otherwise the right-most x-forwarded-for entry: the one our own proxy appended.
 */
export function clientIp(source: Request | Headers): string {
  const h = source instanceof Headers ? source : source.headers;
  const trusted = process.env.TRUSTED_IP_HEADER;
  if (trusted) return h.get(trusted)?.trim() || "unknown";
  if (process.env.VERCEL) return h.get("x-real-ip")?.trim() || "unknown";
  const chain = h
    .get("x-forwarded-for")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return chain?.at(-1) || h.get("x-real-ip")?.trim() || "local";
}

export function tooManyRequests(retryAfter: number) {
  return Response.json(
    { error: "Too many requests. Please wait a moment and try again.", code: "rate_limited" },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}
