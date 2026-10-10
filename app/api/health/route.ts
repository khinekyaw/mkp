import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/** For uptime monitors: 200 when the app can reach its database. */
export async function GET() {
  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, dbMs: Date.now() - started }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("[health] database check failed", err);
    return Response.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
