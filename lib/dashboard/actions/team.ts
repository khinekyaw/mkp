"use server";

import { and, count, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { fieldErrors, type ActionState } from "../../actions";
import { audit, userActor } from "../../audit";
import { requireBusiness } from "../../business/access";
import { db, schema } from "../../db";
import type { MemberRole } from "../../db/schema";
import { newToken } from "../../id";
import { enqueue, kickJobs } from "../../jobs/queue";
import { inviteEmail } from "../../notifications/templates";
import { getSiteCopy } from "../../site-locale";
import { appUrl } from "../../url";

const ROLES = ["owner", "admin", "staff"] as const;
const INVITE_DAYS = 7;

async function ownerCount(businessId: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.membership)
    .where(and(eq(schema.membership.businessId, businessId), eq(schema.membership.role, "owner")));
  return Number(n);
}

export async function inviteMemberAction(slug: string, _: ActionState, form: FormData): Promise<ActionState> {
  const [{ business, user, role: myRole }, { t }] = await Promise.all([requireBusiness(slug, "admin"), getSiteCopy()]);
  const m = t.dash.msg;
  const parsed = z
    .object({ email: z.email(m.enterEmail).transform((e) => e.trim().toLowerCase()), role: z.enum(ROLES) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error, m.checkFields);
  const { email, role } = parsed.data;
  if (role === "owner" && myRole !== "owner") return { ok: false, error: m.ownerOnly };

  const [existing] = await db
    .select({ id: schema.membership.id })
    .from(schema.membership)
    .innerJoin(schema.user, eq(schema.user.id, schema.membership.userId))
    .where(and(eq(schema.membership.businessId, business.id), eq(schema.user.email, email)))
    .limit(1);
  if (existing) return { ok: false, error: m.alreadyMember, fields: { email: [m.alreadyMember] } };

  // Re-inviting replaces any earlier pending invite (new link, new expiry).
  await db
    .delete(schema.invitation)
    .where(and(eq(schema.invitation.businessId, business.id), eq(schema.invitation.email, email), isNull(schema.invitation.acceptedAt)));
  const token = newToken();
  const [invite] = await db
    .insert(schema.invitation)
    .values({ businessId: business.id, email, role, token, invitedBy: user.id, expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000) })
    .returning();
  await enqueue("email.send", {
    email: inviteEmail({ to: email, businessName: business.name, inviterName: user.name, role, url: appUrl(`/invite/${token}`) }),
  });
  after(kickJobs);
  await audit({
    businessId: business.id,
    actor: userActor(user),
    action: "team.invited",
    target: { type: "invitation", id: invite.id },
    data: { email, role },
  });
  refresh();
  return { ok: true, message: m.inviteSent(email) };
}

export async function revokeInviteAction(slug: string, inviteId: string): Promise<ActionState> {
  const [{ business, user }, { t }] = await Promise.all([requireBusiness(slug, "admin"), getSiteCopy()]);
  const [gone] = await db
    .delete(schema.invitation)
    .where(and(eq(schema.invitation.id, inviteId), eq(schema.invitation.businessId, business.id)))
    .returning({ email: schema.invitation.email });
  if (gone) {
    await audit({ businessId: business.id, actor: userActor(user), action: "team.invite_revoked", data: { email: gone.email } });
  }
  refresh();
  return { ok: true, message: t.dash.msg.inviteRevoked };
}

async function loadMember(businessId: string, membershipId: string) {
  const [row] = await db
    .select({ id: schema.membership.id, role: schema.membership.role, userId: schema.membership.userId, name: schema.user.name })
    .from(schema.membership)
    .innerJoin(schema.user, eq(schema.user.id, schema.membership.userId))
    .where(and(eq(schema.membership.id, membershipId), eq(schema.membership.businessId, businessId)))
    .limit(1);
  return row ?? null;
}

export async function removeMemberAction(slug: string, membershipId: string): Promise<ActionState> {
  const [{ business, user, role: myRole }, { t }] = await Promise.all([requireBusiness(slug, "admin"), getSiteCopy()]);
  const m = t.dash.msg;
  const member = await loadMember(business.id, membershipId);
  if (!member) return { ok: false, error: m.notMember };
  if (member.role === "owner" && myRole !== "owner") return { ok: false, error: m.ownerOnly };
  if (member.role === "owner" && (await ownerCount(business.id)) <= 1) return { ok: false, error: m.lastOwner };
  await db.delete(schema.membership).where(eq(schema.membership.id, member.id));
  await audit({
    businessId: business.id,
    actor: userActor(user),
    action: "team.removed",
    target: { type: "user", id: member.userId },
    data: { name: member.name, role: member.role },
  });
  refresh();
  return { ok: true, message: m.memberRemoved };
}

export async function changeRoleAction(slug: string, membershipId: string, role: MemberRole): Promise<ActionState> {
  const [{ business, user, role: myRole }, { t }] = await Promise.all([requireBusiness(slug, "admin"), getSiteCopy()]);
  const m = t.dash.msg;
  if (!ROLES.includes(role)) return { ok: false, error: m.checkFields };
  const member = await loadMember(business.id, membershipId);
  if (!member) return { ok: false, error: m.notMember };
  // Making or unmaking an owner is an owner's call.
  if ((role === "owner" || member.role === "owner") && myRole !== "owner") return { ok: false, error: m.ownerOnly };
  if (member.role === "owner" && role !== "owner" && (await ownerCount(business.id)) <= 1) return { ok: false, error: m.lastOwner };
  await db.update(schema.membership).set({ role }).where(eq(schema.membership.id, member.id));
  await audit({
    businessId: business.id,
    actor: userActor(user),
    action: "team.role",
    target: { type: "user", id: member.userId },
    data: { name: member.name, from: member.role, to: role },
  });
  refresh();
  return { ok: true, message: m.roleChanged };
}
