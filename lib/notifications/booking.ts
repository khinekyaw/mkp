import { and, eq, inArray } from "drizzle-orm";
import { getBookingDetails, type BookingDetails } from "../bookings/service";
import { db, schema } from "../db";
import { appUrl } from "../url";
import { sendSafely } from "./mailer";
import { businessBookingEmail, customerBookingEmail, type BookingEmailData } from "./templates";

async function staffEmails(businessId: string, businessEmail: string | null) {
  const rows = await db
    .select({ email: schema.user.email })
    .from(schema.membership)
    .innerJoin(schema.user, eq(schema.user.id, schema.membership.userId))
    .where(and(eq(schema.membership.businessId, businessId), inArray(schema.membership.role, ["owner", "admin"])));
  return [...new Set([businessEmail, ...rows.map((r) => r.email)].filter((e): e is string => !!e))];
}

function emailData(d: BookingDetails): BookingEmailData {
  const locale = d.booking.locale === "my" ? "my" : "en";
  return {
    businessName: d.business.name,
    businessPhone: d.business.phone,
    businessAddress: d.business.address,
    serviceName: locale === "my" && d.service.nameMy ? d.service.nameMy : d.service.name,
    providerName: d.provider.name,
    customerName: d.booking.customerName,
    customerPhone: d.booking.customerPhone,
    customerEmail: d.booking.customerEmail,
    note: d.booking.note,
    startsAt: d.booking.startsAt,
    timezone: d.business.timezone,
    locale,
    status: d.booking.status,
    manageUrl: appUrl(`/manage/${d.booking.id}?t=${d.booking.manageToken}`),
    dashboardUrl: appUrl(`/dashboard/${d.business.slug}/calendar?date=${d.booking.startsAt.toISOString().slice(0, 10)}`),
  };
}

/** New booking: confirmation to the patient, alert to the clinic (unless staff made it). */
export async function notifyBookingCreated(bookingId: string, { notifyStaff = true } = {}) {
  const d = await getBookingDetails(bookingId);
  if (!d) return;
  const data = emailData(d);
  const jobs: Promise<void>[] = [];
  if (d.booking.customerEmail) jobs.push(sendSafely(customerBookingEmail({ ...data, to: d.booking.customerEmail })));
  if (notifyStaff) {
    const to = await staffEmails(d.business.id, d.business.email);
    if (to.length) jobs.push(sendSafely(businessBookingEmail({ ...data, to, event: "created" })));
  }
  await Promise.all(jobs);
}

/** Status change the patient should hear about (confirmation of a pending request, cancellation). */
export async function notifyCustomerOfStatus(bookingId: string) {
  const d = await getBookingDetails(bookingId);
  if (!d?.booking.customerEmail) return;
  await sendSafely(customerBookingEmail({ ...emailData(d), to: d.booking.customerEmail }));
}

/** Patient cancelled online: tell the clinic. */
export async function notifyCancelledByCustomer(bookingId: string) {
  const d = await getBookingDetails(bookingId);
  if (!d) return;
  const data = emailData(d);
  const to = await staffEmails(d.business.id, d.business.email);
  await Promise.all([
    to.length ? sendSafely(businessBookingEmail({ ...data, to, event: "cancelled" })) : null,
    d.booking.customerEmail ? sendSafely(customerBookingEmail({ ...data, to: d.booking.customerEmail })) : null,
  ]);
}
