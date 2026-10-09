"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors, type ActionState } from "../../actions";
import { requireBusiness } from "../../business/access";
import { isSlugAvailable } from "../../business/create";
import { businessSettingsSchema, VERTICALS } from "../../business/settings";
import { db, schema } from "../../db";
import { isValidTimeZone } from "../../scheduling/time";
import { themeSchema, type Theme } from "../../theme";

export async function saveThemeAction(slug: string, theme: Theme, website: string | null): Promise<ActionState> {
  const { business } = await requireBusiness(slug, "admin");
  const parsed = themeSchema.safeParse({ ...theme, name: business.name });
  if (!parsed.success) return { ok: false, error: "That theme isn't valid." };
  const site = website && /^https?:\/\//.test(website) && website.length < 300 ? website : undefined;
  await db
    .update(schema.business)
    .set({ theme: parsed.data, ...(site && !business.website ? { website: site } : {}) })
    .where(eq(schema.business.id, business.id));
  refresh();
  return { ok: true };
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/, "3–40 characters: letters, numbers and dashes"),
  vertical: z.enum(VERTICALS),
  timezone: z.string().refine(isValidTimeZone, "Choose a timezone"),
  phone: z.string().trim().max(30),
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  address: z.string().trim().max(200),
  website: z
    .string()
    .trim()
    .max(300)
    .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
    .pipe(z.union([z.literal(""), z.url("Enter a valid website")])),
});

export async function saveProfileAction(slug: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { business } = await requireBusiness(slug, "admin");
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  const d = parsed.data;
  if (d.slug !== business.slug && !(await isSlugAvailable(d.slug, business.id))) {
    return { ok: false, error: "That link is taken.", fields: { slug: ["That link is taken"] } };
  }
  await db
    .update(schema.business)
    .set({
      name: d.name,
      slug: d.slug,
      timezone: d.timezone,
      phone: d.phone || null,
      email: d.email || null,
      address: d.address || null,
      website: d.website || null,
      settings: { ...business.settings, vertical: d.vertical },
      theme: business.theme ? { ...business.theme, name: d.name } : null,
    })
    .where(eq(schema.business.id, business.id));
  if (d.slug !== business.slug) redirect(`/dashboard/${d.slug}/settings`);
  refresh();
  return { ok: true, message: "Business details saved" };
}

const rulesSchema = businessSettingsSchema.pick({
  leadMinutes: true,
  horizonDays: true,
  slotIntervalMin: true,
  requireConfirmation: true,
  cancelNoticeHours: true,
  allowProviderChoice: true,
  locales: true,
});

export async function saveBookingRulesAction(slug: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { business } = await requireBusiness(slug, "admin");
  const locales = form.getAll("locales").map(String);
  const defaultLocale = String(form.get("defaultLocale") ?? "en");
  const parsed = rulesSchema.safeParse({
    leadMinutes: Number(form.get("leadMinutes")),
    horizonDays: Number(form.get("horizonDays")),
    slotIntervalMin: Number(form.get("slotIntervalMin")),
    cancelNoticeHours: Number(form.get("cancelNoticeHours")),
    requireConfirmation: form.get("requireConfirmation") === "on",
    allowProviderChoice: form.get("allowProviderChoice") === "on",
    // Default language first.
    locales: [...new Set([defaultLocale, ...locales])].filter((l) => locales.includes(l) || l === defaultLocale),
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  await db
    .update(schema.business)
    .set({ settings: { ...business.settings, ...parsed.data } })
    .where(eq(schema.business.id, business.id));
  refresh();
  return { ok: true, message: "Booking rules saved" };
}
