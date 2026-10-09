import { getPublicBusiness } from "@/lib/business/public";

export async function GET(_: Request, ctx: RouteContext<"/api/public/b/[businessId]">) {
  const { businessId } = await ctx.params;
  const business = await getPublicBusiness({ id: businessId });
  if (!business) return Response.json({ error: "Not found" }, { status: 404 });
  // Readable cross-origin so embed.js on customer sites can style its launcher.
  return Response.json(business, {
    headers: { "cache-control": "public, max-age=30", "access-control-allow-origin": "*" },
  });
}
