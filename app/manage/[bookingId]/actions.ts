"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { canCustomerCancel, getBookingDetails, setBookingStatus } from "@/lib/bookings/service";
import { constantTimeEqual } from "@/lib/crypto";
import { notifyCancelledByCustomer } from "@/lib/notifications/booking";

export type CancelState = { ok: boolean; error?: string } | null;

export async function cancelByCustomer(_: CancelState, form: FormData): Promise<CancelState> {
  const bookingId = String(form.get("bookingId") ?? "");
  const token = String(form.get("token") ?? "");
  const details = await getBookingDetails(bookingId);
  if (!details || !constantTimeEqual(token, details.booking.manageToken)) return { ok: false, error: "Not found." };
  if (!canCustomerCancel(details)) return { ok: false, error: "This appointment can no longer be cancelled online." };

  await setBookingStatus(bookingId, details.business.id, "cancelled", "Cancelled by patient");
  after(() => notifyCancelledByCustomer(bookingId));
  refresh();
  return { ok: true };
}
