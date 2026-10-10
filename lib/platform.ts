import "server-only";
import { cache } from "react";
import { db, schema } from "./db";

/** Platform-wide switches set from the super-admin. */
export type PlatformSettings = {
  announcement: { en: string; my: string };
  maintenance: boolean;
};

const DEFAULTS: PlatformSettings = { announcement: { en: "", my: "" }, maintenance: false };

export const getPlatformSettings = cache(async (): Promise<PlatformSettings> => {
  const rows = await db.select().from(schema.platformSetting);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    announcement: { ...DEFAULTS.announcement, ...(map.announcement as Partial<PlatformSettings["announcement"]>) },
    maintenance: map.maintenance === true,
  };
});

export async function setPlatformSetting<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
  await db
    .insert(schema.platformSetting)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.platformSetting.key, set: { value, updatedAt: new Date() } });
}
