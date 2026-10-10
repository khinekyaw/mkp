import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import type { DetectThemeResult } from "./schema";

const TTL_MS = 7 * 24 * 60 * 60_000;

/** One entry per page: lowercase host without "www.", plus the path. */
export function themeCacheKey(input: string): string | null {
  try {
    const url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
    return `${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return null;
  }
}

export async function readThemeCache(key: string): Promise<DetectThemeResult | null> {
  const [row] = await db.select().from(schema.themeCache).where(eq(schema.themeCache.key, key)).limit(1);
  if (!row || Date.now() - row.createdAt.getTime() > TTL_MS) return null;
  return row.result as DetectThemeResult;
}

export async function writeThemeCache(key: string, result: DetectThemeResult) {
  await db
    .insert(schema.themeCache)
    .values({ key, result })
    .onConflictDoUpdate({ target: schema.themeCache.key, set: { result, createdAt: new Date() } });
}
