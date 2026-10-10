"use server";

import { and, eq, isNull, ne, or } from "drizzle-orm";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "../actions";
import { audit, userActor } from "../audit";
import { auth } from "../auth";
import { isSlugAvailable } from "../business/create";
import { db, schema } from "../db";
import { runDueJobs } from "../jobs/queue";
import { setPlatformSetting } from "../platform";
import { getSiteCopy } from "../site-locale";
import { requireAdminAction } from "./access";

// Every action here re-checks the platform-admin gate and leaves an audit entry.

async function context() {
  const [user, { t }] = await Promise.all([requireAdminAction(), getSiteCopy()]);
  return { user, actor: userActor(user, { admin: true }), m: t.admin.msg, c: t.admin.common };
}

const reasonOf = (reason: string) => reason.trim().slice(0, 500);

async function loadBusiness(id: string) {
  const [b] = await db.select().from(schema.business).where(eq(schema.business.id, id)).limit(1);
  return b ?? null;
}

// ---------------------------------------------------------------------------
// Clinics
// ---------------------------------------------------------------------------

export async function setBusinessStatusAction(businessId: string, status: "active" | "suspended", reason: string): Promise<ActionState> {
  const { actor, m, c } = await context();
  if (!reasonOf(reason)) return { ok: false, error: c.reasonRequired };
  const business = await loadBusiness(businessId);
  if (!business) return { ok: false, error: c.none };
  await db.update(schema.business).set({ status }).where(eq(schema.business.id, businessId));
  await audit({
    businessId,
    actor,
    action: status === "suspended" ? "business.suspended" : "business.restored",
    data: { reason: reasonOf(reason) },
  });
  refresh();
  return { ok: true, message: status === "suspended" ? m.suspended : m.restored };
}

export async function setBusinessDeletedAction(businessId: string, deleted: boolean, reason: string): Promise<ActionState> {
  const { actor, m, c } = await context();
  if (!reasonOf(reason)) return { ok: false, error: c.reasonRequired };
  await db
    .update(schema.business)
    .set(deleted ? { deletedAt: new Date(), status: "suspended" } : { deletedAt: null, status: "active" })
    .where(eq(schema.business.id, businessId));
  await audit({
    businessId,
    actor,
    action: deleted ? "business.deleted" : "business.restored",
    data: { reason: reasonOf(reason), ...(deleted ? {} : { undeleted: true }) },
  });
  refresh();
  return { ok: true, message: deleted ? m.deleted : m.undeleted };
}

const planSchema = z.object({
  plan: z.enum(["trial", "free", "starter", "pro"]),
  trialEndsAt: z.union([z.literal(""), z.iso.date()]),
});

export async function savePlanAction(businessId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { actor, m, c } = await context();
  const parsed = planSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: c.none };
  const trialEndsAt = parsed.data.trialEndsAt ? new Date(`${parsed.data.trialEndsAt}T23:59:59Z`) : null;
  await db.update(schema.business).set({ plan: parsed.data.plan, trialEndsAt }).where(eq(schema.business.id, businessId));
  await audit({ businessId, actor, action: "admin.plan", data: { plan: parsed.data.plan, trialEndsAt: parsed.data.trialEndsAt || null } });
  refresh();
  return { ok: true, message: m.saved };
}

const paymentSchema = z.object({
  amount: z.coerce.number().int().positive(),
  currency: z.string().trim().min(3).max(3).default("MMK"),
  method: z.string().trim().min(1).max(40),
  reference: z.string().trim().max(120).optional(),
  paidUntil: z.iso.date(),
  note: z.string().trim().max(500).optional(),
});

export async function recordPaymentAction(businessId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { user, actor, m, c } = await context();
  const parsed = paymentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: c.none, fields: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;
  const [row] = await db
    .insert(schema.payment)
    .values({
      businessId,
      amount: d.amount,
      currency: d.currency.toUpperCase(),
      method: d.method,
      reference: d.reference || null,
      paidUntil: new Date(`${d.paidUntil}T23:59:59Z`),
      note: d.note || null,
      recordedBy: user.id,
    })
    .returning();
  await audit({ businessId, actor, action: "admin.payment", target: { type: "payment", id: row.id }, data: { amount: d.amount, currency: d.currency, paidUntil: d.paidUntil } });
  refresh();
  return { ok: true, message: m.paymentRecorded };
}

export async function makeOwnerAction(businessId: string, membershipId: string, reason: string): Promise<ActionState> {
  const { actor, m, c } = await context();
  if (!reasonOf(reason)) return { ok: false, error: c.reasonRequired };
  const [updated] = await db
    .update(schema.membership)
    .set({ role: "owner" })
    .where(and(eq(schema.membership.id, membershipId), eq(schema.membership.businessId, businessId)))
    .returning();
  if (!updated) return { ok: false, error: c.none };
  await audit({ businessId, actor, action: "team.role", target: { type: "user", id: updated.userId }, data: { to: "owner", reason: reasonOf(reason) } });
  refresh();
  return { ok: true, message: m.ownerChanged };
}

export async function changeSlugAdminAction(businessId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { actor, m } = await context();
  const slug = String(form.get("slug") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug) || !(await isSlugAvailable(slug, businessId))) {
    return { ok: false, error: m.slugTaken };
  }
  const business = await loadBusiness(businessId);
  await db.update(schema.business).set({ slug }).where(eq(schema.business.id, businessId));
  await audit({ businessId, actor, action: "admin.slug", data: { from: business?.slug, to: slug } });
  refresh();
  return { ok: true, message: m.slugChanged };
}

/** Opens a one-hour support session as the clinic's owner. The reason lands in both audit trails. */
export async function impersonateOwnerAction(businessId: string, reason: string): Promise<ActionState> {
  const { actor, m, c } = await context();
  if (!reasonOf(reason)) return { ok: false, error: c.reasonRequired };
  const business = await loadBusiness(businessId);
  // Platform admins can't be impersonated (Better Auth refuses), so pick an owner who isn't one.
  const [owner] = await db
    .select({ userId: schema.membership.userId })
    .from(schema.membership)
    .innerJoin(schema.user, eq(schema.user.id, schema.membership.userId))
    .where(
      and(
        eq(schema.membership.businessId, businessId),
        eq(schema.membership.role, "owner"),
        or(isNull(schema.user.role), ne(schema.user.role, "admin")),
      ),
    )
    .limit(1);
  if (!business || !owner) return { ok: false, error: m.noOwner };
  await audit({ businessId, actor, action: "admin.impersonated", target: { type: "user", id: owner.userId }, data: { reason: reasonOf(reason) } });
  await auth.api.impersonateUser({ body: { userId: owner.userId }, headers: await headers() });
  redirect(`/dashboard/${business.slug}`);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

async function loadUser(id: string) {
  const [u] = await db.select().from(schema.user).where(eq(schema.user.id, id)).limit(1);
  return u ?? null;
}

export async function verifyUserEmailAction(userId: string): Promise<ActionState> {
  const { actor, m, c } = await context();
  const u = await loadUser(userId);
  if (!u) return { ok: false, error: c.none };
  await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, userId));
  await audit({ actor, action: "admin.user.verified", target: { type: "user", id: userId }, data: { email: u.email } });
  refresh();
  return { ok: true, message: m.verified };
}

export async function sendPasswordResetAction(userId: string): Promise<ActionState> {
  const { actor, m, c } = await context();
  const u = await loadUser(userId);
  if (!u) return { ok: false, error: c.none };
  await auth.api.requestPasswordReset({ body: { email: u.email, redirectTo: "/reset-password" } });
  await audit({ actor, action: "admin.user.reset_sent", target: { type: "user", id: userId }, data: { email: u.email } });
  return { ok: true, message: m.resetSent };
}

export async function setUserBannedAction(userId: string, banned: boolean, reason: string): Promise<ActionState> {
  const { user, actor, m, c } = await context();
  if (userId === user.id) return { ok: false, error: m.cantChangeSelf };
  if (banned && !reasonOf(reason)) return { ok: false, error: c.reasonRequired };
  const h = await headers();
  if (banned) await auth.api.banUser({ body: { userId, banReason: reasonOf(reason) }, headers: h });
  else await auth.api.unbanUser({ body: { userId }, headers: h });
  await audit({ actor, action: banned ? "admin.user.banned" : "admin.user.unbanned", target: { type: "user", id: userId }, data: { reason: reasonOf(reason) || null } });
  refresh();
  return { ok: true, message: banned ? m.banned : m.unbanned };
}

export async function revokeUserSessionsAction(userId: string): Promise<ActionState> {
  const { actor, m } = await context();
  await auth.api.revokeUserSessions({ body: { userId }, headers: await headers() });
  await audit({ actor, action: "admin.user.sessions_revoked", target: { type: "user", id: userId } });
  return { ok: true, message: m.sessionsRevoked };
}

export async function setPlatformAdminAction(userId: string, admin: boolean, reason: string): Promise<ActionState> {
  const { user, actor, m, c } = await context();
  if (userId === user.id) return { ok: false, error: m.cantChangeSelf };
  if (!reasonOf(reason)) return { ok: false, error: c.reasonRequired };
  await auth.api.setRole({ body: { userId, role: admin ? "admin" : "user" }, headers: await headers() });
  await audit({ actor, action: admin ? "admin.user.granted" : "admin.user.revoked", target: { type: "user", id: userId }, data: { reason: reasonOf(reason) } });
  refresh();
  return { ok: true, message: m.roleChanged };
}

// ---------------------------------------------------------------------------
// Jobs and platform settings
// ---------------------------------------------------------------------------

export async function retryJobsAction(jobId: string | null): Promise<ActionState> {
  const { actor, m } = await context();
  const reset = { status: "pending" as const, attempts: 0, runAt: new Date(), lastError: null, updatedAt: new Date() };
  await db
    .update(schema.job)
    .set(reset)
    .where(jobId ? and(eq(schema.job.id, jobId), eq(schema.job.status, "failed")) : eq(schema.job.status, "failed"));
  await audit({ actor, action: "admin.jobs.retried", data: { jobId } });
  refresh();
  return { ok: true, message: m.retried };
}

export async function runJobsNowAction(): Promise<ActionState> {
  const { t } = await getSiteCopy();
  await requireAdminAction();
  const { ran, failed } = await runDueJobs({ budgetMs: 25_000 });
  refresh();
  return { ok: true, message: t.admin.jobs.ran(ran, failed) };
}

export async function savePlatformSettingsAction(_: ActionState, form: FormData): Promise<ActionState> {
  const { actor, m } = await context();
  const announcement = {
    en: String(form.get("announcementEn") ?? "").trim().slice(0, 300),
    my: String(form.get("announcementMy") ?? "").trim().slice(0, 300),
  };
  const maintenance = form.get("maintenance") === "on";
  await setPlatformSetting("announcement", announcement);
  await setPlatformSetting("maintenance", maintenance);
  await audit({ actor, action: "admin.settings", data: { announcement, maintenance } });
  refresh();
  return { ok: true, message: m.saved };
}
