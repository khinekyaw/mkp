import { mkdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export const PGLITE_DIR = path.join(process.cwd(), ".data", "pglite");

/**
 * DATABASE_URL set → real Postgres via postgres-js.
 * Unset → PGlite (embedded Postgres in .data/) so local dev needs no setup.
 */
function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Serverless runs many small instances: keep each pool tiny and point DATABASE_URL at a pooler (e.g. Neon's -pooler host).
    const max = Number(process.env.DATABASE_POOL_MAX) || (process.env.VERCEL ? 3 : 10);
    return drizzlePostgres(postgres(url, { max, prepare: false }), { schema });
  }
  // `next build` imports modules from parallel workers; never let them open the dev database.
  const dir = process.env.NEXT_PHASE === "phase-production-build" ? undefined : PGLITE_DIR;
  // PGlite creates its own folder but not missing parents (a fresh clone has no .data/).
  if (dir) mkdirSync(path.dirname(dir), { recursive: true });
  const client = new PGlite(dir, { extensions: { pg_trgm } });
  if (dir) closeOnShutdown(client);
  // Same query surface; typed as postgres-js so call sites stay driver-agnostic.
  return drizzlePglite(client, { schema }) as unknown as Db;
}

/**
 * PGlite can't recover a data directory killed mid-write, so close it when the
 * dev server is stopped (Ctrl+C). Next's own shutdown is async and exits after
 * it, which gives the close time to finish.
 */
function closeOnShutdown(client: PGlite) {
  const close = (signal: NodeJS.Signals) => {
    // Inside `next dev`, Next's handler exits the process; in a plain script
    // (db:seed…) nobody else will, since a listener disables Node's default exit.
    const othersWillExit = process.listenerCount(signal) > 0;
    void client
      .close()
      .catch(() => {})
      .finally(() => {
        if (!othersWillExit) process.exit(signal === "SIGINT" ? 130 : 143);
      });
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

// Cached on globalThis so dev hot reloads don't open a second connection/PGlite instance.
const g = globalThis as unknown as { __db?: Db };

/** Lazily created on first use, so importing this module never opens a connection. */
export const db: Db = new Proxy({} as Db, {
  get(_, prop) {
    const real = (g.__db ??= createDb());
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };

export function isPglite() {
  return !process.env.DATABASE_URL;
}

/** The underlying drizzle instance (migrators need it, not the proxy). */
export function rawDb(): Db {
  return (g.__db ??= createDb());
}

/** Flushes and closes the connection (scripts only; PGlite must close cleanly). */
export async function closeDb() {
  const real = g.__db as unknown as { $client?: { close?: () => Promise<void>; end?: () => Promise<void> } } | undefined;
  if (!real?.$client) return;
  try {
    await (real.$client.close?.() ?? real.$client.end?.());
  } finally {
    // Forget the instance even if closing failed (e.g. PGlite already aborted).
    g.__db = undefined;
  }
}
