"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { fieldErrors, type ActionState } from "../../actions";
import { requireBusiness } from "../../business/access";
import { db, schema } from "../../db";
import { getSiteCopy } from "../../site-locale";
import type { DashCopy } from "../../copy/dashboard";

const customerSchema = (m: DashCopy["msg"]) =>
  z.object({
    name: z.string().trim().min(2, m.enterName).max(80),
    email: z.union([z.literal(""), z.email(m.enterEmail)]),
    notes: z.string().trim().max(2000),
  });

export async function updateCustomerAction(slug: string, customerId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const [{ business }, { t }] = await Promise.all([requireBusiness(slug, "staff"), getSiteCopy()]);
  const m = t.dash.msg;
  const parsed = customerSchema(m).safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error, m.checkFields);
  await db
    .update(schema.customer)
    .set({ name: parsed.data.name, email: parsed.data.email || null, notes: parsed.data.notes || null })
    .where(and(eq(schema.customer.id, customerId), eq(schema.customer.businessId, business.id)));
  refresh();
  return { ok: true, message: m.saved };
}
