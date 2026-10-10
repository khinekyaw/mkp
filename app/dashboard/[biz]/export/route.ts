import { eq, inArray } from "drizzle-orm";
import { audit, userActor } from "@/lib/audit";
import { requireBusiness } from "@/lib/business/access";
import { db, schema } from "@/lib/db";

/** Everything stored for one clinic, as a JSON download. Owners only: it includes patient data. */
export async function GET(_: Request, ctx: RouteContext<"/dashboard/[biz]/export">) {
  const { biz } = await ctx.params;
  const { business, user } = await requireBusiness(biz, "owner");
  const id = business.id;
  const providers = await db.select().from(schema.provider).where(eq(schema.provider.businessId, id));
  const [services, providerServices, schedules, timeOff, customers, bookings] = await Promise.all([
    db.select().from(schema.service).where(eq(schema.service.businessId, id)),
    providers.length
      ? db.select().from(schema.providerService).where(inArray(schema.providerService.providerId, providers.map((p) => p.id)))
      : [],
    db.select().from(schema.schedule).where(eq(schema.schedule.businessId, id)),
    db.select().from(schema.timeOff).where(eq(schema.timeOff.businessId, id)),
    db.select().from(schema.customer).where(eq(schema.customer.businessId, id)),
    db.select().from(schema.booking).where(eq(schema.booking.businessId, id)),
  ]);
  // Manage tokens are credentials; they don't belong in an export file.
  const safeBookings = bookings.map((b) => ({ ...b, manageToken: undefined }));
  const { theme, settings, ...profile } = business;

  await audit({ businessId: id, actor: userActor(user), action: "business.exported" });
  const body = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      business: profile,
      settings,
      theme,
      services,
      providers,
      providerServices,
      schedules,
      timeOff,
      customers,
      bookings: safeBookings,
    },
    null,
    2,
  );
  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${business.slug}-${date}.json"`,
      "cache-control": "no-store",
    },
  });
}
