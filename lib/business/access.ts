import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "../auth";
import { db, schema } from "../db";
import type { MemberRole } from "../db/schema";
import { readSettings } from "./settings";

const RANK: Record<MemberRole, number> = { staff: 1, admin: 2, owner: 3 };

export class ForbiddenError extends Error {}

/** Current session, deduplicated per request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session.user;
}

export const listMemberships = cache(async (userId: string) =>
  db
    .select({
      role: schema.membership.role,
      business: { id: schema.business.id, slug: schema.business.slug, name: schema.business.name },
    })
    .from(schema.membership)
    .innerJoin(schema.business, eq(schema.business.id, schema.membership.businessId))
    .where(eq(schema.membership.userId, userId))
    .orderBy(asc(schema.membership.createdAt)),
);

const loadMembership = cache(async (userId: string, slug: string) => {
  const [row] = await db
    .select({ business: schema.business, role: schema.membership.role })
    .from(schema.membership)
    .innerJoin(schema.business, eq(schema.business.id, schema.membership.businessId))
    .where(and(eq(schema.membership.userId, userId), eq(schema.business.slug, slug)))
    .limit(1);
  return row ?? null;
});

/**
 * Resolves the business from the URL slug and checks the signed-in user's role.
 * Every dashboard page and action goes through this.
 */
export async function requireBusiness(slug: string, minRole: MemberRole = "staff") {
  const user = await requireUser();
  const row = await loadMembership(user.id, slug);
  if (!row) notFound();
  if (RANK[row.role] < RANK[minRole]) throw new ForbiddenError("You don't have permission to do that.");
  return {
    user,
    role: row.role,
    business: { ...row.business, settings: readSettings(row.business.settings) },
  };
}

export function canManage(role: MemberRole) {
  return RANK[role] >= RANK.admin;
}

export type BusinessContext = Awaited<ReturnType<typeof requireBusiness>>;
