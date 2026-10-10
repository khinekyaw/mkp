import { and, asc, eq, isNull } from "drizzle-orm";
import { db, schema } from "../db";
import type { Business } from "../db/schema";
import { getPlatformSettings } from "../platform";
import { DEFAULT_THEME, type Theme } from "../theme";
import { readSettings, type Vertical } from "./settings";

export type PublicService = {
  id: string;
  name: string;
  nameMy: string | null;
  description: string | null;
  durationMin: number;
  price: number | null;
  currency: string;
  providerIds: string[];
};

export type PublicProvider = { id: string; name: string; title: string | null };

/** Everything the booking widget needs; contains no private data. */
export type PublicBusiness = {
  id: string;
  slug: string;
  name: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  theme: Theme;
  locales: ("en" | "my")[];
  vertical: Vertical;
  allowProviderChoice: boolean;
  horizonDays: number;
  services: PublicService[];
  providers: PublicProvider[];
};

/** Public surfaces only ever see active businesses; a suspended one is indistinguishable from a missing one. */
const isPublic = eq(schema.business.status, "active");

/** The full row behind the public API (availability, booking), or null if missing or suspended. */
export async function findPublicBusinessRow(id: string): Promise<Business | null> {
  if ((await getPlatformSettings()).maintenance) return null;
  const [biz] = await db.select().from(schema.business).where(and(eq(schema.business.id, id), isPublic)).limit(1);
  return biz ?? null;
}

/**
 * For a suspended (not deleted) business: just enough to tell patients how to
 * reach the clinic instead of showing a dead page. Null otherwise.
 */
export async function getUnavailableNotice(by: { id: string } | { slug: string }) {
  // Platform maintenance pauses every clinic, not only suspended ones.
  const maintenance = (await getPlatformSettings()).maintenance;
  const [biz] = await db
    .select({ name: schema.business.name, phone: schema.business.phone, theme: schema.business.theme })
    .from(schema.business)
    .where(
      and(
        "id" in by ? eq(schema.business.id, by.id) : eq(schema.business.slug, by.slug),
        maintenance ? undefined : eq(schema.business.status, "suspended"),
        isNull(schema.business.deletedAt),
      ),
    )
    .limit(1);
  return biz ? { name: biz.name, phone: biz.phone, theme: { ...(biz.theme ?? DEFAULT_THEME), name: biz.name } } : null;
}

/** `includeSuspended` is for the business's own dashboard (e.g. the studio preview), never a public surface. */
export async function getPublicBusiness(
  by: { id: string } | { slug: string },
  { includeSuspended = false } = {},
): Promise<PublicBusiness | null> {
  if (!includeSuspended && (await getPlatformSettings()).maintenance) return null;
  const [biz] = await db
    .select()
    .from(schema.business)
    .where(
      and("id" in by ? eq(schema.business.id, by.id) : eq(schema.business.slug, by.slug), includeSuspended ? undefined : isPublic),
    )
    .limit(1);
  if (!biz) return null;

  const [services, providers, links] = await Promise.all([
    db
      .select()
      .from(schema.service)
      .where(and(eq(schema.service.businessId, biz.id), eq(schema.service.active, true)))
      .orderBy(asc(schema.service.sortOrder), asc(schema.service.createdAt)),
    db
      .select({ id: schema.provider.id, name: schema.provider.name, title: schema.provider.title })
      .from(schema.provider)
      .where(and(eq(schema.provider.businessId, biz.id), eq(schema.provider.active, true)))
      .orderBy(asc(schema.provider.sortOrder), asc(schema.provider.createdAt)),
    db
      .select({ providerId: schema.providerService.providerId, serviceId: schema.providerService.serviceId })
      .from(schema.providerService)
      .innerJoin(schema.service, eq(schema.service.id, schema.providerService.serviceId))
      .where(eq(schema.service.businessId, biz.id)),
  ]);

  const activeProviders = new Set(providers.map((p) => p.id));
  const publicServices = services
    .map((s) => ({
      id: s.id,
      name: s.name,
      nameMy: s.nameMy,
      description: s.description,
      durationMin: s.durationMin,
      price: s.price,
      currency: s.currency,
      providerIds: links.filter((l) => l.serviceId === s.id && activeProviders.has(l.providerId)).map((l) => l.providerId),
    }))
    // A service nobody performs can't be booked.
    .filter((s) => s.providerIds.length > 0);
  const bookable = new Set(publicServices.flatMap((s) => s.providerIds));
  const settings = readSettings(biz.settings);

  return {
    id: biz.id,
    slug: biz.slug,
    name: biz.name,
    phone: biz.phone,
    address: biz.address,
    timezone: biz.timezone,
    theme: { ...(biz.theme ?? DEFAULT_THEME), name: biz.name },
    locales: settings.locales,
    vertical: settings.vertical,
    allowProviderChoice: settings.allowProviderChoice,
    horizonDays: settings.horizonDays,
    services: publicServices,
    providers: providers.filter((p) => bookable.has(p.id)),
  };
}
