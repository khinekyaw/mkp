"use server";

import { and, count, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors, type ActionState } from "../../actions";
import { requireBusiness } from "../../business/access";
import { db, schema } from "../../db";
import { zonedToUtc, addDays } from "../../scheduling/time";

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

const optionalInt = (max: number) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v.replace(/[,\s]/g, ""))))
    .pipe(z.number().int().min(0).max(max).nullable());

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Enter a name").max(80),
  nameMy: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional(),
  durationMin: z.coerce.number().int().min(5, "At least 5 minutes").max(600),
  bufferMin: z.coerce.number().int().min(0).max(240).default(0),
  price: optionalInt(100_000_000),
  currency: z.string().trim().length(3).toUpperCase().default("MMK"),
  active: z.boolean().default(false),
  providerIds: z.array(z.string()).default([]),
});

export async function saveServiceAction(slug: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { business } = await requireBusiness(slug, "admin");
  const parsed = serviceSchema.safeParse({
    ...Object.fromEntries(form),
    active: form.get("active") === "on",
    providerIds: form.getAll("providerIds").map(String),
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, providerIds, ...data } = parsed.data;
  const values = { ...data, nameMy: data.nameMy || null, description: data.description || null };

  // Only link providers that belong to this business.
  const validProviders = (
    await db.select({ id: schema.provider.id }).from(schema.provider).where(eq(schema.provider.businessId, business.id))
  )
    .map((p) => p.id)
    .filter((p) => providerIds.includes(p));

  await db.transaction(async (tx) => {
    let serviceId = id;
    if (id) {
      const [updated] = await tx
        .update(schema.service)
        .set(values)
        .where(and(eq(schema.service.id, id), eq(schema.service.businessId, business.id)))
        .returning({ id: schema.service.id });
      if (!updated) throw new Error("Service not found");
      await tx.delete(schema.providerService).where(eq(schema.providerService.serviceId, id));
    } else {
      const [{ n }] = await tx.select({ n: count() }).from(schema.service).where(eq(schema.service.businessId, business.id));
      const [created] = await tx
        .insert(schema.service)
        .values({ ...values, businessId: business.id, sortOrder: Number(n) })
        .returning({ id: schema.service.id });
      serviceId = created.id;
    }
    if (validProviders.length) {
      await tx.insert(schema.providerService).values(validProviders.map((providerId) => ({ providerId, serviceId: serviceId! })));
    }
  });
  refresh();
  return { ok: true, message: id ? "Service updated" : "Service added" };
}

export async function deleteServiceAction(slug: string, serviceId: string): Promise<ActionState> {
  const { business } = await requireBusiness(slug, "admin");
  const [{ n }] = await db.select({ n: count() }).from(schema.booking).where(eq(schema.booking.serviceId, serviceId));
  if (Number(n) > 0) {
    // Keep history intact: services with bookings are hidden, not deleted.
    await db
      .update(schema.service)
      .set({ active: false })
      .where(and(eq(schema.service.id, serviceId), eq(schema.service.businessId, business.id)));
    refresh();
    return { ok: true, message: "Service has bookings, so it was hidden instead of deleted" };
  }
  await db.delete(schema.service).where(and(eq(schema.service.id, serviceId), eq(schema.service.businessId, business.id)));
  refresh();
  return { ok: true, message: "Service deleted" };
}

// ---------------------------------------------------------------------------
// Staff (providers)
// ---------------------------------------------------------------------------

const providerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Enter a name").max(80),
  title: z.string().trim().max(80).optional(),
  bio: z.string().trim().max(500).optional(),
  active: z.boolean().default(true),
  serviceIds: z.array(z.string()).default([]),
});

export async function saveProviderAction(slug: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { business } = await requireBusiness(slug, "admin");
  const isNew = !form.get("id");
  const parsed = providerSchema.safeParse({
    ...Object.fromEntries(form),
    active: isNew ? true : form.get("active") === "on",
    serviceIds: form.getAll("serviceIds").map(String),
  });
  if (!parsed.success) return fieldErrors(parsed.error);
  const { id, serviceIds, ...data } = parsed.data;
  const values = { ...data, title: data.title || null, bio: data.bio || null };
  const validServices = (
    await db.select({ id: schema.service.id }).from(schema.service).where(eq(schema.service.businessId, business.id))
  )
    .map((s) => s.id)
    .filter((s) => serviceIds.includes(s));

  const providerId = await db.transaction(async (tx) => {
    let pid = id;
    if (id) {
      const [updated] = await tx
        .update(schema.provider)
        .set(values)
        .where(and(eq(schema.provider.id, id), eq(schema.provider.businessId, business.id)))
        .returning({ id: schema.provider.id });
      if (!updated) throw new Error("Staff member not found");
      await tx.delete(schema.providerService).where(eq(schema.providerService.providerId, id));
    } else {
      const [{ n }] = await tx.select({ n: count() }).from(schema.provider).where(eq(schema.provider.businessId, business.id));
      const [created] = await tx
        .insert(schema.provider)
        .values({ ...values, businessId: business.id, sortOrder: Number(n) })
        .returning({ id: schema.provider.id });
      pid = created.id;
    }
    if (validServices.length) {
      await tx.insert(schema.providerService).values(validServices.map((serviceId) => ({ providerId: pid!, serviceId })));
    }
    return pid!;
  });

  if (isNew) redirect(`/dashboard/${business.slug}/staff/${providerId}?created=1`);
  refresh();
  return { ok: true, message: "Saved" };
}

export async function deleteProviderAction(slug: string, providerId: string): Promise<ActionState> {
  const { business } = await requireBusiness(slug, "admin");
  const [{ n }] = await db.select({ n: count() }).from(schema.booking).where(eq(schema.booking.providerId, providerId));
  if (Number(n) > 0) {
    await db
      .update(schema.provider)
      .set({ active: false })
      .where(and(eq(schema.provider.id, providerId), eq(schema.provider.businessId, business.id)));
    refresh();
    return { ok: true, message: "Has past bookings, so they were deactivated instead of deleted" };
  }
  await db.delete(schema.provider).where(and(eq(schema.provider.id, providerId), eq(schema.provider.businessId, business.id)));
  redirect(`/dashboard/${business.slug}/staff`);
}

// ---------------------------------------------------------------------------
// Weekly hours
// ---------------------------------------------------------------------------

const intervalsSchema = z
  .array(z.object({ weekday: z.number().int().min(0).max(6), startMin: z.number().int().min(0).max(1440), endMin: z.number().int().min(0).max(1440) }))
  .max(70)
  .superRefine((rows, ctx) => {
    for (const r of rows) {
      if (r.endMin <= r.startMin) ctx.addIssue({ code: "custom", message: "Each closing time must be after its opening time." });
    }
    for (let d = 0; d < 7; d++) {
      const day = rows.filter((r) => r.weekday === d).sort((a, b) => a.startMin - b.startMin);
      for (let i = 1; i < day.length; i++) {
        if (day[i].startMin < day[i - 1].endMin) ctx.addIssue({ code: "custom", message: "Time ranges on the same day can't overlap." });
      }
    }
  });

function parseIntervals(form: FormData) {
  try {
    return intervalsSchema.safeParse(JSON.parse(String(form.get("schedule") ?? "[]")));
  } catch {
    return intervalsSchema.safeParse(null);
  }
}

export async function saveBusinessHoursAction(slug: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { business } = await requireBusiness(slug, "admin");
  const parsed = parseIntervals(form);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid hours" };
  await db.transaction(async (tx) => {
    await tx.delete(schema.schedule).where(and(eq(schema.schedule.businessId, business.id), isNull(schema.schedule.providerId)));
    if (parsed.data.length) {
      await tx.insert(schema.schedule).values(parsed.data.map((r) => ({ ...r, businessId: business.id, providerId: null })));
    }
  });
  refresh();
  return { ok: true, message: "Opening hours saved" };
}

export async function saveProviderHoursAction(slug: string, providerId: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { business } = await requireBusiness(slug, "admin");
  const useBusinessHours = form.get("useBusinessHours") === "on";
  const parsed = parseIntervals(form);
  if (!useBusinessHours && !parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid hours" };
  await db.transaction(async (tx) => {
    const [p] = await tx
      .update(schema.provider)
      .set({ useBusinessHours })
      .where(and(eq(schema.provider.id, providerId), eq(schema.provider.businessId, business.id)))
      .returning({ id: schema.provider.id });
    if (!p) throw new Error("Staff member not found");
    await tx.delete(schema.schedule).where(eq(schema.schedule.providerId, providerId));
    if (!useBusinessHours && parsed.success && parsed.data.length) {
      await tx.insert(schema.schedule).values(parsed.data.map((r) => ({ ...r, businessId: business.id, providerId })));
    }
  });
  refresh();
  return { ok: true, message: "Working hours saved" };
}

// ---------------------------------------------------------------------------
// Time off & closures
// ---------------------------------------------------------------------------

const timeOffSchema = z
  .object({
    providerId: z.string().optional(),
    allDay: z.boolean(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    reason: z.string().trim().max(120).optional(),
  })
  .refine((v) => v.allDay || (v.startTime && v.endTime), { message: "Choose start and end times", path: ["startTime"] });

export async function addTimeOffAction(slug: string, _: ActionState, form: FormData): Promise<ActionState> {
  const { business } = await requireBusiness(slug, "admin");
  const parsed = timeOffSchema.safeParse({ ...Object.fromEntries(form), allDay: form.get("allDay") === "on" });
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  const tz = business.timezone;
  const startsAt = v.allDay ? zonedToUtc(v.startDate, "00:00", tz) : zonedToUtc(v.startDate, v.startTime!, tz);
  const endsAt = v.allDay ? zonedToUtc(addDays(v.endDate, 1), "00:00", tz) : zonedToUtc(v.endDate, v.endTime!, tz);
  if (endsAt <= startsAt) return { ok: false, error: "The end must be after the start.", fields: { endDate: ["Must be after the start"] } };

  let providerId: string | null = null;
  if (v.providerId) {
    const [p] = await db
      .select({ id: schema.provider.id })
      .from(schema.provider)
      .where(and(eq(schema.provider.id, v.providerId), eq(schema.provider.businessId, business.id)))
      .limit(1);
    if (!p) return { ok: false, error: "Staff member not found." };
    providerId = p.id;
  }
  await db.insert(schema.timeOff).values({ businessId: business.id, providerId, startsAt, endsAt, reason: v.reason || null });
  refresh();
  return { ok: true, message: providerId ? "Time off added" : "Closure added" };
}

export async function deleteTimeOffAction(slug: string, id: string): Promise<ActionState> {
  const { business } = await requireBusiness(slug, "admin");
  await db.delete(schema.timeOff).where(and(eq(schema.timeOff.id, id), eq(schema.timeOff.businessId, business.id)));
  refresh();
  return { ok: true, message: "Removed" };
}
