import "server-only";
import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import { DELETE_GRACE_DAYS } from "../business/settings";
import { db, schema } from "../db";
import {
  notifyBookingCreated,
  notifyCancelledByCustomer,
  notifyCustomerOfStatus,
  notifyReminder,
  notifyRescheduled,
} from "../notifications/booking";
import { getMailer, type Email } from "../notifications/mailer";
import { purgeExpiredLimits } from "../rate-limit";
import { registerJob } from "./queue";

// Every job type the worker knows. Payloads are plain JSON.

const str = (v: unknown) => String(v ?? "");

registerJob("booking.created", (p) => notifyBookingCreated(str(p.bookingId), { notifyStaff: p.notifyStaff !== false }));
registerJob("booking.status", (p) => notifyCustomerOfStatus(str(p.bookingId)));
registerJob("booking.cancelled_by_customer", (p) => notifyCancelledByCustomer(str(p.bookingId)));
registerJob("booking.rescheduled", (p) => notifyRescheduled(str(p.bookingId), { byCustomer: p.byCustomer === true }));
registerJob("booking.reminder", (p) => notifyReminder(str(p.bookingId), str(p.startsAt)));
registerJob("email.send", (p) => getMailer().send(p.email as Email));


registerJob("maintenance.daily", async () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
  await purgeExpiredLimits();
  await db.delete(schema.themeCache).where(lt(schema.themeCache.createdAt, daysAgo(7)));
  await db.delete(schema.job).where(and(eq(schema.job.status, "done"), lt(schema.job.updatedAt, daysAgo(30))));
  await db.delete(schema.invitation).where(lt(schema.invitation.expiresAt, daysAgo(30)));
  await db.delete(schema.verification).where(lt(schema.verification.expiresAt, new Date()));
  await db.delete(schema.session).where(lt(schema.session.expiresAt, new Date()));
  // Hard-delete clinics past their grace period (cascades to all their data).
  const doomed = await db
    .select({ id: schema.business.id })
    .from(schema.business)
    .where(and(isNotNull(schema.business.deletedAt), lt(schema.business.deletedAt, daysAgo(DELETE_GRACE_DAYS))));
  if (doomed.length) {
    const ids = doomed.map((b) => b.id);
    // Bookings restrict deletes of services/providers/customers, so remove them first.
    await db.transaction(async (tx) => {
      await tx.delete(schema.booking).where(inArray(schema.booking.businessId, ids));
      await tx.delete(schema.business).where(inArray(schema.business.id, ids));
    });
    console.info(`[jobs] purged ${ids.length} deleted business(es)`);
  }
});
