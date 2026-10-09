import { eq, like } from "drizzle-orm";
import { db, schema } from "../db";
import type { Theme } from "../theme/schema";
import { slugify } from "../id";
import { DEFAULT_SETTINGS, PROVIDER_LABEL, type Vertical } from "./settings";
import { DEFAULT_HOURS, STARTER_SERVICES } from "./starters";

export { DEFAULT_HOURS, STARTER_SERVICES };

export async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base);
  const taken = new Set(
    (await db.select({ slug: schema.business.slug }).from(schema.business).where(like(schema.business.slug, `${root}%`))).map(
      (r) => r.slug,
    ),
  );
  if (!taken.has(root) && !RESERVED_SLUGS.has(root)) return root;
  for (let i = 2; ; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
}

export const RESERVED_SLUGS = new Set(["new", "api", "admin", "dashboard", "settings", "onboarding", "embed", "b", "manage"]);

export async function isSlugAvailable(slug: string, exceptBusinessId?: string) {
  if (RESERVED_SLUGS.has(slug)) return false;
  const [row] = await db.select({ id: schema.business.id }).from(schema.business).where(eq(schema.business.slug, slug)).limit(1);
  return !row || row.id === exceptBusinessId;
}

export type CreateBusinessInput = {
  ownerId: string;
  ownerName: string;
  name: string;
  vertical: Vertical;
  timezone: string;
  website?: string | null;
  phone?: string | null;
  theme?: Theme | null;
  /** Fixed id/slug (used by the demo seed). */
  id?: string;
  slug?: string;
};

/** Creates a ready-to-book business: owner membership, opening hours, starter services, one provider. */
export async function createBusiness(input: CreateBusinessInput) {
  const slug = input.slug ?? (await uniqueSlug(input.name));
  return db.transaction(async (tx) => {
    const [biz] = await tx
      .insert(schema.business)
      .values({
        ...(input.id ? { id: input.id } : {}),
        slug,
        name: input.name.trim(),
        timezone: input.timezone,
        website: input.website || null,
        phone: input.phone || null,
        theme: input.theme ?? null,
        settings: { ...DEFAULT_SETTINGS, vertical: input.vertical },
      })
      .returning();

    await tx.insert(schema.membership).values({ businessId: biz.id, userId: input.ownerId, role: "owner" });
    await tx.insert(schema.schedule).values(DEFAULT_HOURS.map((h) => ({ ...h, businessId: biz.id, providerId: null })));

    const services = await tx
      .insert(schema.service)
      .values(STARTER_SERVICES[input.vertical].map((s, i) => ({ ...s, businessId: biz.id, sortOrder: i })))
      .returning({ id: schema.service.id });

    const [prov] = await tx
      .insert(schema.provider)
      .values({
        businessId: biz.id,
        userId: input.ownerId,
        name: input.ownerName,
        title: PROVIDER_LABEL[input.vertical].en,
      })
      .returning({ id: schema.provider.id });
    await tx.insert(schema.providerService).values(services.map((s) => ({ providerId: prov.id, serviceId: s.id })));

    return biz;
  });
}
