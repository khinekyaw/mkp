import { eq } from "drizzle-orm";
import { getAvailability, BookingError } from "@/lib/bookings/service";
import { availabilityQuerySchema, type AvailabilityResponse } from "@/lib/bookings/public-api";
import { db, schema } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: Request, ctx: RouteContext<"/api/public/b/[businessId]/availability">) {
  const limited = rateLimit(`avail:${clientIp(request)}`, { limit: 120, windowMs: 60_000 });
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  const { businessId } = await ctx.params;
  const query = availabilityQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return Response.json({ error: "Invalid query" }, { status: 400 });

  const [business] = await db.select().from(schema.business).where(eq(schema.business.id, businessId)).limit(1);
  if (!business) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const { days } = await getAvailability({
      business,
      serviceId: query.data.service,
      providerId: query.data.provider ?? null,
      fromDate: query.data.from,
      days: query.data.days,
    });
    const body: AvailabilityResponse = {
      timezone: business.timezone,
      // Which provider is free stays server-side.
      days: days.map((d) => ({ date: d.date, open: d.open, slots: d.slots.map((s) => ({ start: s.start })) })),
    };
    return Response.json(body, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof BookingError) return Response.json({ error: err.message }, { status: 422 });
    throw err;
  }
}
