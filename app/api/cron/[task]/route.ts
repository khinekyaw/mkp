import { constantTimeEqual } from "@/lib/crypto";
import { enqueue, runDueJobs } from "@/lib/jobs/queue";

export const maxDuration = 60;

/**
 * Called by the scheduler (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`).
 *   /api/cron/jobs   drain due jobs (every few minutes)
 *   /api/cron/daily  queue the daily maintenance, then drain
 */
export async function GET(request: Request, ctx: RouteContext<"/api/cron/[task]">) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const allowed = secret ? constantTimeEqual(given, secret) : process.env.NODE_ENV === "development";
  if (!allowed) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { task } = await ctx.params;
  if (task === "daily") {
    const day = new Date().toISOString().slice(0, 10);
    await enqueue("maintenance.daily", {}, { dedupeKey: `maintenance:${day}` });
  } else if (task !== "jobs") {
    return Response.json({ error: "Unknown task" }, { status: 404 });
  }
  const result = await runDueJobs({ budgetMs: 50_000 });
  return Response.json(result, { headers: { "cache-control": "no-store" } });
}
