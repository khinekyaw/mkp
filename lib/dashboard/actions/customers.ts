"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { fieldErrors, type ActionState } from "../../actions";
import { requireBusiness } from "../../business/access";
import { db, schema } from "../../db";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  notes: z.string().trim().max(2000),
});

export async function updateCustomerAction(slug: string, customerId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { business } = await requireBusiness(slug, "staff");
  const parsed = customerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return fieldErrors(parsed.error);
  await db
    .update(schema.customer)
    .set({ name: parsed.data.name, email: parsed.data.email || null, notes: parsed.data.notes || null })
    .where(and(eq(schema.customer.id, customerId), eq(schema.customer.businessId, business.id)));
  refresh();
  return { ok: true, message: "Saved" };
}
