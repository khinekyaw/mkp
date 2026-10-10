import "server-only";
import { enqueue } from "./queue";

// Booking side effects, queued so a mail outage retries instead of losing messages.

const HOUR = 3_600_000;

/** Reminder 24h ahead; for bookings made inside that window, 2h ahead if there's still time. */
export function reminderTime(startsAt: Date, now = new Date()): Date | null {
  const dayBefore = new Date(startsAt.getTime() - 24 * HOUR);
  if (dayBefore.getTime() > now.getTime()) return dayBefore;
  const twoBefore = new Date(startsAt.getTime() - 2 * HOUR);
  return startsAt.getTime() - now.getTime() > 3 * HOUR ? twoBefore : null;
}

export async function scheduleReminder(booking: { id: string; startsAt: Date; customerEmail: string | null }) {
  const runAt = reminderTime(booking.startsAt);
  if (!runAt || !booking.customerEmail) return;
  await enqueue("booking.reminder", { bookingId: booking.id, startsAt: booking.startsAt.toISOString() }, { runAt, dedupeKey: `reminder:${booking.id}` });
}

export async function queueBookingCreated(
  booking: { id: string; startsAt: Date; customerEmail: string | null },
  { notifyStaff = true } = {},
) {
  await enqueue("booking.created", { bookingId: booking.id, notifyStaff });
  await scheduleReminder(booking);
}

export async function queueRescheduled(booking: { id: string; startsAt: Date; customerEmail: string | null }, byCustomer: boolean) {
  await enqueue("booking.rescheduled", { bookingId: booking.id, byCustomer });
  await scheduleReminder(booking);
}
