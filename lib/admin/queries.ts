import "server-only";
import { and, count, desc, eq, gte, ilike, inArray, isNull, max, ne, or, sql } from "drizzle-orm";
import { db, schema } from "../db";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const num = (v: unknown) => Number(v ?? 0);

export async function overviewStats() {
  const b = schema.business;
  const bk = schema.booking;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const since30 = daysAgo(30);

  const [
    [clinics],
    [signups],
    [bookings],
    [active],
    [noShow],
    jobs,
    [ai],
    [funnel],
  ] = await Promise.all([
    db
      .select({
        total: count(),
        suspended: sql<number>`count(*) filter (where ${b.status} = 'suspended' and ${b.deletedAt} is null)`,
        deleted: sql<number>`count(*) filter (where ${b.deletedAt} is not null)`,
      })
      .from(b),
    db
      .select({
        d7: sql<number>`count(*) filter (where ${schema.user.createdAt} >= ${daysAgo(7).toISOString()}::timestamptz)`,
        d30: sql<number>`count(*) filter (where ${schema.user.createdAt} >= ${since30.toISOString()}::timestamptz)`,
      })
      .from(schema.user),
    db
      .select({
        today: sql<number>`count(*) filter (where ${bk.createdAt} >= ${today.toISOString()}::timestamptz)`,
        d7: sql<number>`count(*) filter (where ${bk.createdAt} >= ${daysAgo(7).toISOString()}::timestamptz)`,
        online7: sql<number>`count(*) filter (where ${bk.createdAt} >= ${daysAgo(7).toISOString()}::timestamptz and ${bk.source} <> 'dashboard')`,
      })
      .from(bk),
    db.select({ n: sql<number>`count(distinct ${bk.businessId})` }).from(bk).where(gte(bk.createdAt, daysAgo(7))),
    db
      .select({
        noShow: sql<number>`count(*) filter (where ${bk.status} = 'no_show')`,
        finished: sql<number>`count(*) filter (where ${bk.status} in ('no_show', 'completed'))`,
      })
      .from(bk)
      .where(and(gte(bk.startsAt, since30), sql`${bk.startsAt} < now()`)),
    db.select({ status: schema.job.status, n: count() }).from(schema.job).groupBy(schema.job.status),
    db
      .select({ n: schema.throttle.count })
      .from(schema.throttle)
      .where(eq(schema.throttle.key, `theme:ai:${new Date().toISOString().slice(0, 10)}`)),
    db
      .select({
        created: count(),
        configured: sql<number>`count(*) filter (where exists (select 1 from provider_service ps join service s on s.id = ps.service_id where s.business_id = business.id))`,
        shared: sql<number>`count(*) filter (where ${b.theme} is not null)`,
        booked: sql<number>`count(*) filter (where exists (select 1 from booking x where x.business_id = business.id and x.source <> 'dashboard'))`,
      })
      .from(b)
      .where(gte(b.createdAt, since30)),
  ]);

  const jobCount = (s: string) => num(jobs.find((j) => j.status === s)?.n);
  return {
    clinics: { total: num(clinics.total), suspended: num(clinics.suspended), deleted: num(clinics.deleted), active7: num(active.n) },
    signups: { d7: num(signups.d7), d30: num(signups.d30) },
    bookings: { today: num(bookings.today), d7: num(bookings.d7), online7: num(bookings.online7) },
    noShowRate: num(noShow.finished) ? num(noShow.noShow) / num(noShow.finished) : null,
    jobs: { pending: jobCount("pending") + jobCount("running"), failed: jobCount("failed") },
    aiToday: num(ai?.n),
    funnel: { created: num(funnel.created), configured: num(funnel.configured), shared: num(funnel.shared), booked: num(funnel.booked) },
  };
}

/** Owner emails per business, for listings. */
function ownerEmails(businessIds: string[]) {
  if (!businessIds.length) return Promise.resolve([]);
  return db
    .select({ businessId: schema.membership.businessId, email: schema.user.email, name: schema.user.name, userId: schema.user.id })
    .from(schema.membership)
    .innerJoin(schema.user, eq(schema.user.id, schema.membership.userId))
    .where(and(inArray(schema.membership.businessId, businessIds), eq(schema.membership.role, "owner")));
}

export async function listBusinessesAdmin({ q }: { q?: string }) {
  const b = schema.business;
  const term = q?.trim();
  const matchingOwners = term
    ? db
        .select({ id: schema.membership.businessId })
        .from(schema.membership)
        .innerJoin(schema.user, eq(schema.user.id, schema.membership.userId))
        .where(ilike(schema.user.email, `%${term}%`))
    : null;
  const rows = await db
    .select({
      id: b.id,
      name: b.name,
      slug: b.slug,
      status: b.status,
      plan: b.plan,
      trialEndsAt: b.trialEndsAt,
      deletedAt: b.deletedAt,
      createdAt: b.createdAt,
      bookings30: sql<number>`(select count(*) from booking x where x.business_id = business.id and x.created_at >= ${daysAgo(30).toISOString()}::timestamptz)`,
      lastBooking: sql<Date | null>`(select max(x.created_at) from booking x where x.business_id = business.id)`,
    })
    .from(b)
    .where(term ? or(ilike(b.name, `%${term}%`), ilike(b.slug, `%${term}%`), inArray(b.id, matchingOwners!)) : undefined)
    .orderBy(desc(b.createdAt))
    .limit(200);
  const owners = await ownerEmails(rows.map((r) => r.id));
  return rows.map((r) => ({
    ...r,
    bookings30: num(r.bookings30),
    lastBooking: r.lastBooking ? new Date(r.lastBooking) : null,
    owners: owners.filter((o) => o.businessId === r.id),
  }));
}

export async function getBusinessAdmin(id: string) {
  const [business] = await db.select().from(schema.business).where(eq(schema.business.id, id)).limit(1);
  if (!business) return null;
  const [members, payments, [counts], activity] = await Promise.all([
    db
      .select({ id: schema.membership.id, role: schema.membership.role, userId: schema.user.id, name: schema.user.name, email: schema.user.email })
      .from(schema.membership)
      .innerJoin(schema.user, eq(schema.user.id, schema.membership.userId))
      .where(eq(schema.membership.businessId, id))
      .orderBy(schema.membership.createdAt),
    db.select().from(schema.payment).where(eq(schema.payment.businessId, id)).orderBy(desc(schema.payment.createdAt)),
    db
      .select({
        bookings: count(),
        upcoming: sql<number>`count(*) filter (where ${schema.booking.startsAt} >= now() and ${schema.booking.status} in ('pending', 'confirmed'))`,
        customers: sql<number>`(select count(*) from customer c where c.business_id = ${id})`,
      })
      .from(schema.booking)
      .where(eq(schema.booking.businessId, id)),
    db
      .select()
      .from(schema.auditEvent)
      .where(eq(schema.auditEvent.businessId, id))
      .orderBy(desc(schema.auditEvent.createdAt))
      .limit(30),
  ]);
  return {
    business,
    members,
    payments,
    counts: { bookings: num(counts.bookings), upcoming: num(counts.upcoming), customers: num(counts.customers) },
    activity,
  };
}

export async function listUsersAdmin({ q }: { q?: string }) {
  const u = schema.user;
  const term = q?.trim();
  const rows = await db
    .select({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      twoFactorEnabled: u.twoFactorEnabled,
      role: u.role,
      banned: u.banned,
      createdAt: u.createdAt,
      clinics: sql<number>`(select count(*) from membership m where m.user_id = "user".id)`,
    })
    .from(u)
    .where(term ? or(ilike(u.email, `%${term}%`), ilike(u.name, `%${term}%`)) : undefined)
    .orderBy(desc(u.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r, clinics: num(r.clinics) }));
}

export async function billingRows() {
  const b = schema.business;
  const rows = await db
    .select({
      id: b.id,
      name: b.name,
      slug: b.slug,
      plan: b.plan,
      trialEndsAt: b.trialEndsAt,
      paidUntil: max(schema.payment.paidUntil),
    })
    .from(b)
    .leftJoin(schema.payment, eq(schema.payment.businessId, b.id))
    .where(isNull(b.deletedAt))
    .groupBy(b.id)
    .orderBy(b.name);
  const owners = await ownerEmails(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, owners: owners.filter((o) => o.businessId === r.id) }));
}

export async function jobsAdmin() {
  const [counts, failed, upcoming] = await Promise.all([
    db.select({ status: schema.job.status, n: count() }).from(schema.job).groupBy(schema.job.status),
    db.select().from(schema.job).where(eq(schema.job.status, "failed")).orderBy(desc(schema.job.updatedAt)).limit(100),
    db
      .select()
      .from(schema.job)
      .where(and(ne(schema.job.status, "done"), ne(schema.job.status, "failed")))
      .orderBy(schema.job.runAt)
      .limit(50),
  ]);
  const n = (s: string) => num(counts.find((c) => c.status === s)?.n);
  return { pending: n("pending") + n("running"), failed: n("failed"), failedJobs: failed, upcoming };
}

export async function adminAudit() {
  return db
    .select({ event: schema.auditEvent, businessName: schema.business.name, businessId: schema.business.id })
    .from(schema.auditEvent)
    .leftJoin(schema.business, eq(schema.business.id, schema.auditEvent.businessId))
    .where(eq(schema.auditEvent.actorType, "admin"))
    .orderBy(desc(schema.auditEvent.createdAt))
    .limit(300);
}
