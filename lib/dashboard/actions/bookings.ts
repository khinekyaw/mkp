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
import { getSiteCopy } from "../../site-locale";
import type { DashCopy } from "../../copy/dashboard";

const STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;

export async function setBookingStatusAction(
  slug: string,
  bookingId: string,
  status: BookingStatus,
  reason?: string,
): Promise<ActionState> {
  const [{ business }, { t }] = await Promise.all([requireBusiness(slug, "staff"), getSiteCopy()]);
  if (!STATUSES.includes(status)) return { ok: false, error: t.dash.msg.unknownStatus };

  const [current] = await db
    .select({ status: schema.booking.status })
    .from(schema.booking)
    .where(and(eq(schema.booking.id, bookingId), eq(schema.booking.businessId, business.id)))
    .limit(1);
  if (!current) return { ok: false, error: t.dash.msg.bookingNotFound };

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
  const [{ business }, { t }] = await Promise.all([requireBusiness(slug, "staff"), getSiteCopy()]);
  if (!isDateString(query.date)) return { error: t.dash.msg.pickDate };
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
    if (err instanceof BookingError) return { error: t.dash.msg.bookingErrors[err.code] ?? err.message };
    throw err;
  }
}

const staffBookingSchema = (m: DashCopy["msg"]) =>
  z.object({
    serviceId: z.string().min(1, m.chooseService),
    providerId: z.string().nullable(),
    start: z.iso.datetime({ message: m.chooseTime }),
    name: z.string().trim().min(2, m.enterPatientName).max(80),
    phone: z.string().trim().regex(PHONE_PATTERN, m.enterPhone),
    email: z.union([z.literal(""), z.email(m.enterEmail)]).optional(),
    note: z.string().trim().max(500).optional(),
    locale: z.enum(["en", "my"]).default("en"),
  });

export async function createStaffBookingAction(
  slug: string,
  input: z.input<ReturnType<typeof staffBookingSchema>>,
): Promise<ActionResult & { bookingId?: string }> {
  const [{ business }, { t }] = await Promise.all([requireBusiness(slug, "staff"), getSiteCopy()]);
  const m = t.dash.msg;
  const parsed = staffBookingSchema(m).safeParse(input);
  if (!parsed.success) return fieldErrors(parsed.error, m.checkFields);
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
    if (err instanceof BookingError) return { ok: false, error: m.bookingErrors[err.code] ?? err.message, code: err.code };
    throw err;
  }
}
