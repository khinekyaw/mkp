"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import type { ActionResult, ActionState } from "../../actions";
import { fieldErrors } from "../../actions";
import { BookingError, createBooking, getAvailability } from "../../bookings/service";
import { requireBusiness } from "../../business/access";
import { db, schema } from "../../db";
import type { BookingStatus } from "../../db/schema";
import { notifyBookingCreated, notifyCustomerOfStatus } from "../../notifications/booking";
import { PHONE_PATTERN } from "../../phone";
import { isDateString } from "../../scheduling/time";

const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;

export async function setBookingStatusAction(
  slug: string,
  bookingId: string,
  status: BookingStatus,
  reason?: string,
): Promise<ActionState> {
  const { business } = await requireBusiness(slug, "staff");
  if (!STATUSES.includes(status)) return { ok: false, error: "Unknown status." };

  const [current] = await db
    .select({ status: schema.booking.status })
    .from(schema.booking)
    .where(and(eq(schema.booking.id, bookingId), eq(schema.booking.businessId, business.id)))
    .limit(1);
  if (!current) return { ok: false, error: "Booking not found." };

  await db
    .update(schema.booking)
    .set({
      status,
      cancelledAt: status === "cancelled" ? new Date() : null,
      cancelReason: status === "cancelled" ? reason?.trim() || null : null,
    })
    .where(and(eq(schema.booking.id, bookingId), eq(schema.booking.businessId, business.id)));

  // Tell the patient when a request is confirmed or the clinic cancels.
  if ((current.status === "pending" && status === "confirmed") || (status === "cancelled" && current.status !== "cancelled")) {
    after(() => notifyCustomerOfStatus(bookingId));
  }
  refresh();
  return { ok: true };
}

export type StaffSlots = { open: boolean; slots: { start: string; providerIds: string[] }[] } | { error: string };

export async function staffSlotsAction(
  slug: string,
  query: { serviceId: string; providerId: string | null; date: string },
): Promise<StaffSlots> {
  const { business } = await requireBusiness(slug, "staff");
  if (!isDateString(query.date)) return { error: "Pick a date." };
  try {
    const { days } = await getAvailability({
      business,
      serviceId: query.serviceId,
      providerId: query.providerId,
      fromDate: query.date,
      days: 1,
      asStaff: true,
    });
    return { open: days[0].open, slots: days[0].slots };
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    throw err;
  }
}

const staffBookingSchema = z.object({
  serviceId: z.string().min(1, "Choose a service"),
  providerId: z.string().nullable(),
  start: z.iso.datetime({ message: "Choose a time" }),
  name: z.string().trim().min(2, "Enter the patient's name").max(80),
  phone: z.string().trim().regex(PHONE_PATTERN, "Enter a valid phone number"),
  email: z.union([z.literal(""), z.email("Enter a valid email")]).optional(),
  note: z.string().trim().max(500).optional(),
  locale: z.enum(["en", "my"]).default("en"),
});

export async function createStaffBookingAction(
  slug: string,
  input: z.input<typeof staffBookingSchema>,
): Promise<ActionResult & { bookingId?: string }> {
  const { business } = await requireBusiness(slug, "staff");
  const parsed = staffBookingSchema.safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error);
  const d = parsed.data;
  try {
    const booking = await createBooking({
      business,
      serviceId: d.serviceId,
      providerId: d.providerId,
      start: d.start,
      customer: { name: d.name, phone: d.phone, email: d.email },
      note: d.note,
      locale: d.locale,
      source: "dashboard",
      asStaff: true,
    });
    after(() => notifyBookingCreated(booking.id, { notifyStaff: false }));
    refresh();
    return { ok: true, bookingId: booking.id };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    throw err;
  }
}
