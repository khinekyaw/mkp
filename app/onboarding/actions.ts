"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors, type ActionState } from "@/lib/actions";
import { requireUser } from "@/lib/business/access";
import { createBusiness } from "@/lib/business/create";
import { VERTICALS } from "@/lib/business/settings";
import { isValidTimeZone } from "@/lib/scheduling/time";
import type { SiteCopy } from "@/lib/site-copy";
import { getSiteCopy } from "@/lib/site-locale";

// Error messages follow the visitor's site language.
const schemaFor = (e: SiteCopy["onboarding"]["errors"]) =>
  z.object({
    name: z.string().trim().min(2, e.name).max(80),
    vertical: z.enum(VERTICALS),
    timezone: z.string().refine(isValidTimeZone, e.timezone),
    website: z
      .string()
      .trim()
      .max(300)
      .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
      .pipe(z.union([z.literal(""), z.url(e.website)])),
    phone: z.string().trim().max(30),
  });

export async function createBusinessAction(_: ActionState, form: FormData): Promise<ActionState> {
  const [user, { t }] = await Promise.all([requireUser(), getSiteCopy()]);
  const parsed = schemaFor(t.onboarding.errors).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);

  const biz = await createBusiness({
    ownerId: user.id,
    ownerName: user.name,
    name: parsed.data.name,
    vertical: parsed.data.vertical,
    timezone: parsed.data.timezone,
    website: parsed.data.website || null,
    phone: parsed.data.phone || null,
  });
  // With a website, jump straight to the magic moment: auto-theming.
  redirect(parsed.data.website ? `/dashboard/${biz.slug}/appearance?detect=1` : `/dashboard/${biz.slug}?welcome=1`);
}
