import "server-only";
import { sql } from "drizzle-orm";
import { db, schema } from "../db";
import type { Job } from "../db/schema";

// A small Postgres-backed job queue. Requests enqueue and nudge the worker with
// `after(runDueJobs)` so work starts right away; the cron route drains whatever
// is left (failed attempts waiting to retry, reminders coming due).

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const MAX_ATTEMPTS = 5;
/** A job left "running" this long is presumed dead (instance killed mid-run) and retried. */
const STALE_LOCK = "10 minutes";

const handlers = new Map<string, JobHandler>();

export function registerJob(type: string, handler: JobHandler) {
  handlers.set(type, handler);
}

/**
 * Queue work. With a `dedupeKey`, re-enqueueing replaces the earlier job
 * (e.g. a reminder after the appointment moves) instead of adding another.
 */
export async function enqueue(
  type: string,
  payload: Record<string, unknown>,
  { runAt = new Date(), dedupeKey }: { runAt?: Date; dedupeKey?: string } = {},
) {
  const values = { type, payload, runAt, dedupeKey, status: "pending" as const, attempts: 0, lastError: null, lockedAt: null };
  if (!dedupeKey) {
    await db.insert(schema.job).values(values);
    return;
  }
  await db
    .insert(schema.job)
    .values(values)
    .onConflictDoUpdate({
      target: schema.job.dedupeKey,
      set: { type, payload, runAt, status: "pending", attempts: 0, lastError: null, lockedAt: null, updatedAt: new Date() },
    });
}

/** Removes a pending job, e.g. the reminder of a cancelled appointment. */
export async function cancelJob(dedupeKey: string) {
  await db.execute(sql`delete from job where dedupe_key = ${dedupeKey} and status = 'pending'`);
}

/** Claims due jobs atomically, so concurrent workers never run the same one. */
async function claim(limit: number): Promise<Job[]> {
  const rows = await db.execute<Record<string, unknown>>(sql`
    update job set status = 'running', locked_at = now(), attempts = attempts + 1, updated_at = now()
    where id in (
      select id from job
      where (status = 'pending' and run_at <= now())
         or (status = 'running' and locked_at < now() - ${STALE_LOCK}::interval)
      order by run_at
      limit ${limit}
      for update skip locked
    )
    returning id, type, payload, attempts
  `);
  // postgres-js returns the rows array; PGlite wraps them in { rows }.
  const list = (Array.isArray(rows) ? rows : (rows as unknown as { rows: Record<string, unknown>[] }).rows) ?? [];
  return list.map((r) => ({ id: r.id, type: r.type, payload: r.payload, attempts: Number(r.attempts) }) as Job);
}

async function finish(job: Job, error?: unknown) {
  if (!error) {
    await db.execute(sql`update job set status = 'done', locked_at = null, last_error = null, updated_at = now() where id = ${job.id}`);
    return;
  }
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (job.attempts >= MAX_ATTEMPTS) {
    console.error(`[jobs] ${job.type} ${job.id} failed for good`, error);
    await db.execute(sql`update job set status = 'failed', locked_at = null, last_error = ${message}, updated_at = now() where id = ${job.id}`);
    return;
  }
  // Back off 1, 4, 9, 16 minutes.
  const delayMin = job.attempts ** 2;
  await db.execute(sql`
    update job set status = 'pending', locked_at = null, last_error = ${message}, updated_at = now(),
      run_at = now() + make_interval(mins => ${delayMin})
    where id = ${job.id}
  `);
}

/** Runs due jobs until none are left or the time budget is spent. Returns how many ran. */
export async function runDueJobs({ budgetMs = 20_000, batch = 10 } = {}): Promise<{ ran: number; failed: number }> {
  await import("./handlers");
  const deadline = Date.now() + budgetMs;
  let ran = 0;
  let failed = 0;
  while (Date.now() < deadline) {
    const jobs = await claim(batch);
    if (!jobs.length) break;
    for (const job of jobs) {
      const handler = handlers.get(job.type);
      try {
        if (!handler) throw new Error(`No handler for job type "${job.type}"`);
        await handler(job.payload);
        await finish(job);
      } catch (err) {
        failed++;
        await finish(job, err);
      }
      ran++;
    }
  }
  return { ran, failed };
}

/** For `after(...)`: never let background work surface as a request error. */
export function kickJobs() {
  return runDueJobs({ budgetMs: 10_000 }).catch((err) => console.error("[jobs] worker failed", err));
}
