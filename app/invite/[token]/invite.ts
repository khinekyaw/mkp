import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";

/** A pending, unexpired invite with its clinic and inviter, or null. */
export async function findInvite(token: string) {
  const [row] = await db
    .select({
      invite: schema.invitation,
      business: { id: schema.business.id, name: schema.business.name, slug: schema.business.slug },
      inviterName: schema.user.name,
    })
    .from(schema.invitation)
    .innerJoin(schema.business, eq(schema.business.id, schema.invitation.businessId))
    .leftJoin(schema.user, eq(schema.user.id, schema.invitation.invitedBy))
    .where(
      and(
        eq(schema.invitation.token, token),
        isNull(schema.invitation.acceptedAt),
        gt(schema.invitation.expiresAt, new Date()),
        isNull(schema.business.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}
