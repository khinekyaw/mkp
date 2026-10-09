import { and, asc, count, eq, gt, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { readSettings } from "../business/settings";
import { db, schema } from "../db";
import type { Business, BookingStatus } from "../db/schema";
import { newToken } from "../id";
import { normalizePhone } from "../phone";
import { computeAvailability, pickProvider, type Range, type WeeklyInterval } from "../scheduling/availability";
import { addDays, dateInZone, dayRangeUtc } from "../scheduling/time";

export const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed"];

export type BookingErrorCode =
  | "invalid_service"
  | "invalid_provider"
  | "slot_unavailable"
  | "not_found"
  | "too_late_to_cancel"
  | "already_cancelled";

export class BookingError extends Error {
  constructor(
    public code: BookingErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

type AvailabilityOptions = {
  business: Business;
  serviceId: string;
  /** Restrict to one provider; null/undefined = anyone who offers the service. */
  providerId?: string | null;
  fromDate: string;
  days: number;
  now?: Date;
  /** Staff booking from the dashboard may ignore lead time and the booking horizon. */
  asStaff?: boolean;
};

export async function getAvailability({ business, serviceId, providerId, fromDate, days, now = new Date(), asStaff }: AvailabilityOptions) {
  const settings = readSettings(business.settings);
  const tz = business.timezone;

  const [service] = await db
    .select()
    .from(schema.service)
    .where(and(eq(schema.service.id, serviceId), eq(schema.service.businessId, business.id), eq(schema.service.active, true)))
    .limit(1);
  if (!service) throw new BookingError("invalid_service", "That service isn't available.");

  const providers = await db
    .select({
      id: schema.provider.id,
      name: schema.provider.name,
      useBusinessHours: schema.provider.useBusinessHours,
    })
    .from(schema.provider)
    .innerJoin(schema.providerService, eq(schema.providerService.providerId, schema.provider.id))
    .where(
      and(
        eq(schema.provider.businessId, business.id),
        eq(schema.provider.active, true),
        eq(schema.providerService.serviceId, serviceId),
        providerId ? eq(schema.provider.id, providerId) : undefined,
      ),
    )
    .orderBy(asc(schema.provider.sortOrder), asc(schema.provider.createdAt));
  if (providerId && !providers.length) throw new BookingError("invalid_provider", "That provider isn't available.");
  const ids = providers.map((p) => p.id);

  // Pad by a day on each side so cross-midnight bookings and absences are seen.
  const rangeStart = dayRangeUtc(addDays(fromDate, -1), tz).start;
  const rangeEnd = dayRangeUtc(addDays(fromDate, days), tz).end;

  const [schedules, absences, busy] = await Promise.all([
    db.select().from(schema.schedule).where(eq(schema.schedule.businessId, business.id)),
    db
      .select()
      .from(schema.timeOff)
      .where(
        and(
          eq(schema.timeOff.businessId, business.id),
          lt(schema.timeOff.startsAt, rangeEnd),
          gt(schema.timeOff.endsAt, rangeStart),
          ids.length ? or(isNull(schema.timeOff.providerId), inArray(schema.timeOff.providerId, ids)) : isNull(schema.timeOff.providerId),
        ),
      ),
    ids.length
      ? db
          .select({
            providerId: schema.booking.providerId,
            startsAt: schema.booking.startsAt,
            endsAt: schema.booking.endsAt,
            bufferMin: schema.booking.bufferMin,
          })
          .from(schema.booking)
          .where(
            and(
              inArray(schema.booking.providerId, ids),
              inArray(schema.booking.status, ACTIVE_STATUSES),
              lt(schema.booking.startsAt, rangeEnd),
              gt(schema.booking.endsAt, rangeStart),
            ),
          )
      : Promise.resolve([]),
  ]);

  const toWeekly = (rows: typeof schedules): WeeklyInterval[] =>
    rows.map((s) => ({ weekday: s.weekday, startMin: s.startMin, endMin: s.endMin }));
  const businessHours = toWeekly(schedules.filter((s) => !s.providerId));
  const toRange = (r: { startsAt: Date; endsAt: Date }): Range => ({ start: r.startsAt.getTime(), end: r.endsAt.getTime() });

  const result = computeAvailability({
    timezone: tz,
    fromDate,
    days,
    now: now.getTime(),
    durationMin: service.durationMin,
    bufferMin: service.bufferMin,
    slotIntervalMin: settings.slotIntervalMin,
    leadMinutes: asStaff ? 0 : settings.leadMinutes,
    horizonDays: asStaff ? 366 : settings.horizonDays,
    closures: absences.filter((a) => !a.providerId).map(toRange),
    providers: providers.map((p) => ({
      id: p.id,
      weekly: p.useBusinessHours ? businessHours : toWeekly(schedules.filter((s) => s.providerId === p.id)),
      timeOff: absences.filter((a) => a.providerId === p.id).map(toRange),
      busy: busy
        .filter((b) => b.providerId === p.id)
        .map((b) => ({ start: b.startsAt.getTime(), end: b.endsAt.getTime() + b.bufferMin * 60_000 })),
    })),
  });

  return { days: result, service, providers, settings };
}

export type CreateBookingInput = {
  business: Business;
  serviceId: string;
  providerId: string | null;
  start: string;
  customer: { name: string; phone: string; email?: string | null };
  note?: string | null;
  locale: "en" | "my";
  source: "widget" | "page" | "dashboard";
  asStaff?: boolean;
};

export async function createBooking(input: CreateBookingInput) {
  const { business } = input;
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) throw new BookingError("slot_unavailable", "That time isn't available.");
  const date = dateInZone(start, business.timezone);

  const { days, service, providers, settings } = await getAvailability({
    business,
    serviceId: input.serviceId,
    providerId: input.providerId,
    fromDate: date,
    days: 1,
    asStaff: input.asStaff,
  });
  const slot = days[0]?.slots.find((s) => s.start === start.toISOString());
  if (!slot) throw new BookingError("slot_unavailable", "Sorry, that time is no longer available.");

  let providerId = input.providerId;
  if (!providerId) {
    const day = dayRangeUtc(date, business.timezone);
    const loads = await db
      .select({ providerId: schema.booking.providerId, n: count() })
      .from(schema.booking)
      .where(
        and(
          inArray(schema.booking.providerId, slot.providerIds),
          inArray(schema.booking.status, ACTIVE_STATUSES),
          gte(schema.booking.startsAt, day.start),
          lt(schema.booking.startsAt, day.end),
        ),
      )
      .groupBy(schema.booking.providerId);
    providerId = pickProvider(
      slot.providerIds,
      new Map(loads.map((l) => [l.providerId, Number(l.n)])),
      providers.map((p) => p.id),
    );
  }
  if (!providerId) throw new BookingError("slot_unavailable", "Sorry, that time is no longer available.");

  const end = new Date(start.getTime() + service.durationMin * 60_000);
  const blockEnd = new Date(end.getTime() + service.bufferMin * 60_000);
  const phone = normalizePhone(input.customer.phone);
  const email = input.customer.email?.trim() || null;
  const status: BookingStatus = !input.asStaff && settings.requireConfirmation ? "pending" : "confirmed";

  return db.transaction(async (tx) => {
    // Serialize bookings per provider, then re-check for overlaps inside the lock.
    await tx.execute(sql`select id from provider where id = ${providerId} for update`);
    const clash = await tx
      .select({ id: schema.booking.id })
      .from(schema.booking)
      .where(
        and(
          eq(schema.booking.providerId, providerId),
          inArray(schema.booking.status, ACTIVE_STATUSES),
          lt(schema.booking.startsAt, blockEnd),
          sql`${schema.booking.endsAt} + make_interval(mins => ${schema.booking.bufferMin}) > ${start.toISOString()}::timestamptz`,
        ),
      )
      .limit(1);
    if (clash.length) throw new BookingError("slot_unavailable", "Sorry, someone just booked that time.");

    const [cust] = await tx
      .insert(schema.customer)
      .values({ businessId: business.id, name: input.customer.name.trim(), phone, email })
      .onConflictDoUpdate({
        target: [schema.customer.businessId, schema.customer.phone],
        set: {
          name: input.customer.name.trim(),
          email: sql`coalesce(excluded.email, ${schema.customer.email})`,
          updatedAt: new Date(),
        },
      })
      .returning();

    const [created] = await tx
      .insert(schema.booking)
      .values({
        businessId: business.id,
        serviceId: service.id,
        providerId,
        customerId: cust.id,
        startsAt: start,
        endsAt: end,
        bufferMin: service.bufferMin,
        status,
        source: input.source,
        customerName: input.customer.name.trim(),
        customerPhone: input.customer.phone.trim(),
        customerEmail: email,
        note: input.note?.trim() || null,
        locale: input.locale,
        manageToken: newToken(),
      })
      .returning();
    return created;
  });
}

/** Loads a booking with everything needed to display or notify about it. */
export async function getBookingDetails(bookingId: string) {
  const [row] = await db
    .select({
      booking: schema.booking,
      service: { id: schema.service.id, name: schema.service.name, nameMy: schema.service.nameMy, durationMin: schema.service.durationMin, price: schema.service.price, currency: schema.service.currency },
      provider: { id: schema.provider.id, name: schema.provider.name, title: schema.provider.title },
      business: schema.business,
    })
    .from(schema.booking)
    .innerJoin(schema.service, eq(schema.service.id, schema.booking.serviceId))
    .innerJoin(schema.provider, eq(schema.provider.id, schema.booking.providerId))
    .innerJoin(schema.business, eq(schema.business.id, schema.booking.businessId))
    .where(eq(schema.booking.id, bookingId))
    .limit(1);
  return row ?? null;
}

export type BookingDetails = NonNullable<Awaited<ReturnType<typeof getBookingDetails>>>;

/** Whether a patient may still cancel online, per the business's notice period. */
export function canCustomerCancel(details: Pick<BookingDetails, "booking" | "business">, now = new Date()) {
  const { cancelNoticeHours } = readSettings(details.business.settings);
  return (
    ACTIVE_STATUSES.includes(details.booking.status) &&
    details.booking.startsAt.getTime() - now.getTime() >= cancelNoticeHours * 3_600_000
  );
}

export async function setBookingStatus(bookingId: string, businessId: string, status: BookingStatus, reason?: string | null) {
  const [updated] = await db
    .update(schema.booking)
    .set({
      status,
      cancelledAt: status === "cancelled" ? new Date() : null,
      cancelReason: status === "cancelled" ? reason?.trim() || null : null,
    })
    .where(and(eq(schema.booking.id, bookingId), eq(schema.booking.businessId, businessId)))
    .returning();
  if (!updated) throw new BookingError("not_found", "Booking not found.");
  return updated;
}
