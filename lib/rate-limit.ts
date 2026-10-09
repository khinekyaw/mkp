// Fixed-window rate limiter kept in process memory. Fine for a single instance;
// swap for Redis/Upstash when running multiple instances.

type Bucket = { count: number; resetAt: number };
const g = globalThis as unknown as { __rateLimit?: Map<string, Bucket> };
const buckets = (g.__rateLimit ??= new Map());

export function rateLimit(key: string, { limit, windowMs }: { limit: number; windowMs: number }) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    return { ok: true, retryAfter: 0 };
  }
  bucket.count++;
  return bucket.count <= limit
    ? { ok: true, retryAfter: 0 }
    : { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export function tooManyRequests(retryAfter: number) {
  return Response.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}
