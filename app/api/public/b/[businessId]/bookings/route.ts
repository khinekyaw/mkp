import { after } from "next/server";
import { audit, PATIENT } from "@/lib/audit";
import { createBookingSchema, type BookingConfirmation } from "@/lib/bookings/public-api";
import { BookingError, createBooking, getBookingDetails } from "@/lib/bookings/service";
import { findPublicBusinessRow } from "@/lib/business/public";
import { queueBookingCreated } from "@/lib/jobs/booking";
import { kickJobs } from "@/lib/jobs/queue";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const HOUR = 60 * 60_000;
/** Online bookings one business accepts per hour before assuming it's under attack. */
const BUSINESS_HOURLY_LIMIT = Number(process.env.BOOKINGS_PER_BUSINESS_HOURLY) || 40;

export async function POST(request: Request, ctx: RouteContext<"/api/public/b/[businessId]/bookings">) {
  const ip = clientIp(request);
  const perIp = await rateLimit(`book:ip:${ip}`, { limit: 8, windowMs: 10 * 60_000 });
  if (!perIp.ok) return tooManyRequests(perIp.retryAfter);

  const { businessId } = await ctx.params;
  const parsed = createBookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Please check the highlighted fields.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const input = parsed.data;

  if (!(await verifyTurnstile(input.turnstileToken, ip))) {
    return Response.json({ error: "Please complete the verification and try again.", code: "verify_failed" }, { status: 400 });
  }

  const business = await findPublicBusinessRow(businessId);
  if (!business) return Response.json({ error: "Not found" }, { status: 404 });

  const perBusiness = await rateLimit(`book:biz:${business.id}`, { limit: BUSINESS_HOURLY_LIMIT, windowMs: HOUR });
  if (!perBusiness.ok) return tooManyRequests(perBusiness.retryAfter);

  try {
    const booking = await createBooking({
      business,
      serviceId: input.serviceId,
      providerId: input.providerId,
      start: input.start,
      customer: { name: input.name, phone: input.phone, email: input.email },
      note: input.note,
      locale: input.locale,
      source: input.source,
    });
    await queueBookingCreated(booking);
    after(kickJobs);
    after(() =>
      audit({
        businessId: business.id,
        actor: { ...PATIENT, name: booking.customerName },
        action: "booking.created",
        target: { type: "booking", id: booking.id },
        data: { startsAt: booking.startsAt.toISOString(), source: booking.source },
      }),
    );
    const details = await getBookingDetails(booking.id);
    const body: BookingConfirmation = {
      id: booking.id,
      status: booking.status === "pending" ? "pending" : "confirmed",
      start: booking.startsAt.toISOString(),
      serviceId: booking.serviceId,
      providerName: details?.provider.name ?? "",
      manageUrl: `/manage/${booking.id}?t=${booking.manageToken}`,
    };
    return Response.json({ booking: body }, { status: 201 });
  } catch (err) {
    if (err instanceof BookingError) {
      return Response.json({ error: err.message, code: err.code }, { status: err.code === "slot_unavailable" ? 409 : 422 });
    }
    throw err;
  }
}
