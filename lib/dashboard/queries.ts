import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lt, max, or, sql } from "drizzle-orm";
import { ACTIVE_STATUSES } from "../bookings/service";
import { db, schema } from "../db";
import type { BookingStatus } from "../db/schema";
import { addDays, dateInZone, dayRangeUtc } from "../scheduling/time";

// Every query takes businessId explicitly: tenant scoping is never implicit.

const bookingColumns = {
  id: schema.booking.id,
  startsAt: schema.booking.startsAt,
  endsAt: schema.booking.endsAt,
  status: schema.booking.status,
  source: schema.booking.source,
  customerId: schema.booking.customerId,
  customerName: schema.booking.customerName,
  customerPhone: schema.booking.customerPhone,
  customerEmail: schema.booking.customerEmail,
  note: schema.booking.note,
  locale: schema.booking.locale,
  cancelReason: schema.booking.cancelReason,
  createdAt: schema.booking.createdAt,
  serviceId: schema.booking.serviceId,
  serviceName: schema.service.name,
  providerId: schema.booking.providerId,
  providerName: schema.provider.name,
};

export type BookingRow = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  source: "widget" | "page" | "dashboard";
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  note: string | null;
  locale: string;
  cancelReason: string | null;
  createdAt: Date;
  serviceId: string;
  serviceName: string;
  providerId: string;
  providerName: string;
};

function bookingsQuery() {
  return db
    .select(bookingColumns)
    .from(schema.booking)
    .innerJoin(schema.service, eq(schema.service.id, schema.booking.serviceId))
    .innerJoin(schema.provider, eq(schema.provider.id, schema.booking.providerId));
}

export async function listBookingsBetween(businessId: string, from: Date, to: Date): Promise<BookingRow[]> {
  return bookingsQuery()
    .where(and(eq(schema.booking.businessId, businessId), gte(schema.booking.startsAt, from), lt(schema.booking.startsAt, to)))
    .orderBy(asc(schema.booking.startsAt));
}

export type AppointmentFilter = "upcoming" | "past" | "pending" | "cancelled" | "all";

export async function listAppointments(
  businessId: string,
  { filter, q, limit = 50, offset = 0 }: { filter: AppointmentFilter; q?: string; limit?: number; offset?: number },
): Promise<BookingRow[]> {
  const now = new Date();
  const search = q?.trim()
    ? or(
        ilike(schema.booking.customerName, `%${q.trim()}%`),
        ilike(schema.booking.customerPhone, `%${q.trim()}%`),
        ilike(schema.booking.customerEmail, `%${q.trim()}%`),
      )
    : undefined;
  const where = {
    upcoming: and(gte(schema.booking.endsAt, now), inArray(schema.booking.status, ACTIVE_STATUSES)),
    past: and(lt(schema.booking.endsAt, now), sql`${schema.booking.status} <> 'cancelled'`),
    pending: eq(schema.booking.status, "pending"),
    cancelled: eq(schema.booking.status, "cancelled"),
    all: undefined,
  }[filter];
  const ascending = filter === "upcoming" || filter === "pending";
  return bookingsQuery()
    .where(and(eq(schema.booking.businessId, businessId), where, search))
    .orderBy(ascending ? asc(schema.booking.startsAt) : desc(schema.booking.startsAt))
    .limit(limit)
    .offset(offset);
}

export async function getOverview(business: { id: string; timezone: string }) {
  const today = dateInZone(new Date(), business.timezone);
  const todayRange = dayRangeUtc(today, business.timezone);
  const weekEnd = dayRangeUtc(addDays(today, 6), business.timezone).end;
  const monthAgo = new Date(Date.now() - 30 * 86_400_000);
  const active = inArray(schema.booking.status, ACTIVE_STATUSES);
  const biz = eq(schema.booking.businessId, business.id);

  const [todayBookings, week, [pending], [newCustomers], [services], [providers], [bookings]] = await Promise.all([
    listBookingsBetween(business.id, todayRange.start, todayRange.end),
    db
      .select({ startsAt: schema.booking.startsAt })
      .from(schema.booking)
      .where(and(biz, active, gte(schema.booking.startsAt, todayRange.start), lt(schema.booking.startsAt, weekEnd))),
    db.select({ n: count() }).from(schema.booking).where(and(biz, eq(schema.booking.status, "pending"), gte(schema.booking.endsAt, new Date()))),
    db
      .select({ n: count() })
      .from(schema.customer)
      .where(and(eq(schema.customer.businessId, business.id), gte(schema.customer.createdAt, monthAgo))),
    db.select({ n: count() }).from(schema.service).where(and(eq(schema.service.businessId, business.id), eq(schema.service.active, true))),
    db.select({ n: count() }).from(schema.provider).where(and(eq(schema.provider.businessId, business.id), eq(schema.provider.active, true))),
    db.select({ n: count() }).from(schema.booking).where(biz),
  ]);

  return {
    today,
    todayBookings,
    weekCount: week.length,
    // Active bookings per local day, today first: the week's load at a glance.
    weekByDay: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i);
      return { date, n: week.filter((b) => dateInZone(b.startsAt, business.timezone) === date).length };
    }),
    pendingCount: Number(pending.n),
    newCustomers: Number(newCustomers.n),
    totals: { services: Number(services.n), providers: Number(providers.n), bookings: Number(bookings.n) },
  };
}

export async function listServices(businessId: string) {
  const [services, links] = await Promise.all([
    db
      .select()
      .from(schema.service)
      .where(eq(schema.service.businessId, businessId))
      .orderBy(asc(schema.service.sortOrder), asc(schema.service.createdAt)),
    db
      .select({ serviceId: schema.providerService.serviceId, providerId: schema.providerService.providerId })
      .from(schema.providerService)
      .innerJoin(schema.service, eq(schema.service.id, schema.providerService.serviceId))
      .where(eq(schema.service.businessId, businessId)),
  ]);
  return services.map((s) => ({ ...s, providerIds: links.filter((l) => l.serviceId === s.id).map((l) => l.providerId) }));
}

export async function listProviders(businessId: string) {
  const [providers, links, schedules] = await Promise.all([
    db
      .select()
      .from(schema.provider)
      .where(eq(schema.provider.businessId, businessId))
      .orderBy(asc(schema.provider.sortOrder), asc(schema.provider.createdAt)),
    db
      .select({ serviceId: schema.providerService.serviceId, providerId: schema.providerService.providerId })
      .from(schema.providerService)
      .innerJoin(schema.provider, eq(schema.provider.id, schema.providerService.providerId))
      .where(eq(schema.provider.businessId, businessId)),
    db.select().from(schema.schedule).where(eq(schema.schedule.businessId, businessId)),
  ]);
  return providers.map((p) => ({
    ...p,
    serviceIds: links.filter((l) => l.providerId === p.id).map((l) => l.serviceId),
    schedule: schedules.filter((s) => s.providerId === p.id),
  }));
}

export async function getBusinessHours(businessId: string) {
  return db
    .select()
    .from(schema.schedule)
    .where(and(eq(schema.schedule.businessId, businessId), isNull(schema.schedule.providerId)))
    .orderBy(asc(schema.schedule.weekday), asc(schema.schedule.startMin));
}

export async function listTimeOff(businessId: string, { providerId, upcomingOnly = true }: { providerId?: string | null; upcomingOnly?: boolean } = {}) {
  return db
    .select({
      id: schema.timeOff.id,
      providerId: schema.timeOff.providerId,
      providerName: schema.provider.name,
      startsAt: schema.timeOff.startsAt,
      endsAt: schema.timeOff.endsAt,
      reason: schema.timeOff.reason,
    })
    .from(schema.timeOff)
    .leftJoin(schema.provider, eq(schema.provider.id, schema.timeOff.providerId))
    .where(
      and(
        eq(schema.timeOff.businessId, businessId),
        providerId === undefined ? undefined : providerId === null ? isNull(schema.timeOff.providerId) : eq(schema.timeOff.providerId, providerId),
        upcomingOnly ? gte(schema.timeOff.endsAt, new Date()) : undefined,
      ),
    )
    .orderBy(asc(schema.timeOff.startsAt));
}

export async function listCustomers(businessId: string, { q, limit = 100 }: { q?: string; limit?: number } = {}) {
  const term = q?.trim();
  return db
    .select({
      id: schema.customer.id,
      name: schema.customer.name,
      phone: schema.customer.phone,
      email: schema.customer.email,
      createdAt: schema.customer.createdAt,
      visits: count(schema.booking.id),
      lastVisit: max(schema.booking.startsAt),
    })
    .from(schema.customer)
    .leftJoin(schema.booking, and(eq(schema.booking.customerId, schema.customer.id), sql`${schema.booking.status} <> 'cancelled'`))
    .where(
      and(
        eq(schema.customer.businessId, businessId),
        term
          ? or(ilike(schema.customer.name, `%${term}%`), ilike(schema.customer.phone, `%${term.replace(/\D/g, "") || term}%`), ilike(schema.customer.email, `%${term}%`))
          : undefined,
      ),
    )
    .groupBy(schema.customer.id)
    .orderBy(desc(max(schema.booking.startsAt)), desc(schema.customer.createdAt))
    .limit(limit);
}

export async function getCustomer(businessId: string, customerId: string) {
  const [customer] = await db
    .select()
    .from(schema.customer)
    .where(and(eq(schema.customer.businessId, businessId), eq(schema.customer.id, customerId)))
    .limit(1);
  if (!customer) return null;
  const bookings = await bookingsQuery()
    .where(and(eq(schema.booking.businessId, businessId), eq(schema.booking.customerId, customerId)))
    .orderBy(desc(schema.booking.startsAt));
  return { customer, bookings };
}

export async function getBookingRow(businessId: string, bookingId: string) {
  const [row] = await bookingsQuery()
    .where(and(eq(schema.booking.businessId, businessId), eq(schema.booking.id, bookingId)))
    .limit(1);
  return row ?? null;
}

/** Members and still-valid pending invites, for the Team page. */
export async function listTeam(businessId: string) {
  const [members, invites] = await Promise.all([
    db
      .select({
        id: schema.membership.id,
        role: schema.membership.role,
        userId: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
      })
      .from(schema.membership)
      .innerJoin(schema.user, eq(schema.user.id, schema.membership.userId))
      .where(eq(schema.membership.businessId, businessId))
      .orderBy(asc(schema.membership.createdAt)),
    db
      .select({ id: schema.invitation.id, email: schema.invitation.email, role: schema.invitation.role, expiresAt: schema.invitation.expiresAt })
      .from(schema.invitation)
      .where(and(eq(schema.invitation.businessId, businessId), isNull(schema.invitation.acceptedAt), gte(schema.invitation.expiresAt, new Date())))
      .orderBy(asc(schema.invitation.createdAt)),
  ]);
  return { members, invites };
}

/** Recent audit events for a clinic, newest first. */
export async function listActivity(businessId: string, { limit = 100 } = {}) {
  return db
    .select()
    .from(schema.auditEvent)
    .where(eq(schema.auditEvent.businessId, businessId))
    .orderBy(desc(schema.auditEvent.createdAt))
    .limit(limit);
}
