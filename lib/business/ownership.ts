import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "../db";

/** Businesses where this user is the only owner (can't be left ownerless). */
export async function soleOwnedBusinesses(userId: string) {
  const m = schema.membership;
  return db
    .select({ id: schema.business.id, name: schema.business.name, slug: schema.business.slug })
    .from(m)
    .innerJoin(schema.business, eq(schema.business.id, m.businessId))
    .where(
      and(
        eq(m.userId, userId),
        eq(m.role, "owner"),
        // Outer row referenced by table name: a drizzle column here would render unqualified and bind to `o`.
        sql`not exists (select 1 from membership o where o.business_id = membership.business_id and o.role = 'owner' and o.user_id <> ${userId})`,
      ),
    );
}
