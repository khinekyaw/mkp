"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { audit, PATIENT } from "@/lib/audit";
import {
  BookingError,
  canCustomerCancel,
  getAvailability,
  getBookingDetails,
  rescheduleBooking,
  setBookingStatus,
  type BookingDetails,
} from "@/lib/bookings/service";
import { constantTimeEqual } from "@/lib/crypto";
import { queueRescheduled } from "@/lib/jobs/booking";
import { cancelJob, enqueue, kickJobs } from "@/lib/jobs/queue";
import { isDateString } from "@/lib/scheduling/time";

export type CancelState = { ok: boolean; error?: string } | null;

/** The manage link is the patient's only credential: the token must match. */
async function authorized(bookingId: string, token: string): Promise<BookingDetails | null> {
  const details = await getBookingDetails(bookingId);
  return details && token && constantTimeEqual(token, details.booking.manageToken) ? details : null;
}

const patient = (d: BookingDetails) => ({ ...PATIENT, name: d.booking.customerName });

export async function cancelByCustomer(_: CancelState, form: FormData): Promise<CancelState> {
  const bookingId = String(form.get("bookingId") ?? "");
  const details = await authorized(bookingId, String(form.get("token") ?? ""));
  if (!details) return { ok: false, error: "Not found." };
  if (!canCustomerCancel(details)) return { ok: false, error: "This appointment can no longer be cancelled online." };

  await setBookingStatus(bookingId, details.business.id, "cancelled", "Cancelled by patient");
  await cancelJob(`reminder:${bookingId}`);
  await enqueue("booking.cancelled_by_customer", { bookingId });
  after(kickJobs);
  await audit({
    businessId: details.business.id,
    actor: patient(details),
    action: "booking.status",
    target: { type: "booking", id: bookingId },
    data: { from: details.booking.status, to: "cancelled", reason: "Cancelled by patient" },
  });
  refresh();
  return { ok: true };
}

export type CustomerSlots = { open: boolean; slots: string[] } | { code: string };

/** Times the patient could move to: same service and provider, ignoring their own current slot. */
export async function customerSlotsAction(bookingId: string, token: string, date: string): Promise<CustomerSlots> {
  const details = await authorized(bookingId, token);
  if (!details || !isDateString(date)) return { code: "generic" };
  if (details.business.status !== "active" || !canCustomerCancel(details)) return { code: "not_reschedulable" };
  try {
    const { days } = await getAvailability({
      business: details.business,
      serviceId: details.booking.serviceId,
      providerId: details.booking.providerId,
      fromDate: date,
      days: 1,
      excludeBookingId: bookingId,
    });
    return { open: days[0].open, slots: days[0].slots.map((s) => s.start) };
  } catch (err) {
    if (err instanceof BookingError) return { code: err.code };
    throw err;
  }
}

export async function rescheduleByCustomer(bookingId: string, token: string, start: string): Promise<{ ok: boolean; code?: string }> {
  const details = await authorized(bookingId, token);
  if (!details) return { ok: false, code: "generic" };
  // Same window as cancelling: past it, changes go through the clinic.
  if (details.business.status !== "active" || !canCustomerCancel(details)) return { ok: false, code: "not_reschedulable" };
  try {
    const { previous, updated } = await rescheduleBooking({ business: details.business, bookingId, start });
    await queueRescheduled(updated, true);
    after(kickJobs);
    await audit({
      businessId: details.business.id,
      actor: patient(details),
      action: "booking.rescheduled",
      target: { type: "booking", id: bookingId },
      data: { from: previous.startsAt.toISOString(), to: updated.startsAt.toISOString() },
    });
    refresh();
    return { ok: true };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, code: err.code };
    throw err;
  }
}
