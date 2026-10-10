import { after } from "next/server";
import { createBookingSchema, type BookingConfirmation } from "@/lib/bookings/public-api";
import { BookingError, createBooking, getBookingDetails } from "@/lib/bookings/service";
import { findPublicBusinessRow } from "@/lib/business/public";
import { notifyBookingCreated } from "@/lib/notifications/booking";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function POST(request: Request, ctx: RouteContext<"/api/public/b/[businessId]/bookings">) {
  const limited = rateLimit(`book:${clientIp(request)}`, { limit: 8, windowMs: 10 * 60_000 });
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  const { businessId } = await ctx.params;
  const parsed = createBookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Please check the highlighted fields.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const business = await findPublicBusinessRow(businessId);
  if (!business) return Response.json({ error: "Not found" }, { status: 404 });

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
    after(() => notifyBookingCreated(booking.id));
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
