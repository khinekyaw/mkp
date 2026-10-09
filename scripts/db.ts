/**
 * Database tasks.
 *   pnpm db:migrate   apply SQL migrations in ./drizzle
 *   pnpm db:setup     migrate, then seed the demo clinic if the database is empty
 *   pnpm db:seed      (re)create the demo clinic
 *   pnpm db:reset     wipe the local PGlite database and set it up again
 *
 * Local PGlite allows one process at a time: stop `next dev` before running these
 * (`pnpm dev` runs db:setup for you).
 */
import { rm } from "node:fs/promises";
import path from "node:path";
import { hashPassword } from "better-auth/crypto";
import { count, eq } from "drizzle-orm";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { createBooking, getAvailability } from "../lib/bookings/service";
import { createBusiness } from "../lib/business/create";
import { closeDb, db, isPglite, PGLITE_DIR, rawDb, schema } from "../lib/db";
import { newId, newToken } from "../lib/id";
import { normalizePhone } from "../lib/phone";
import { addDays, dateInZone, zonedToUtc } from "../lib/scheduling/time";
import { buildTheme } from "../lib/theme";

// Local-development demo account (never use in production).
export const DEMO = {
  email: "owner@golden-lotus.test",
  password: "golden-lotus-demo",
  name: "Aye Aye Khaing",
  businessId: "golden-lotus-demo",
  slug: "golden-lotus",
};

async function migrate() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  // Driver-specific migrators; both read the same SQL files.
  if (isPglite()) await migratePglite(rawDb() as never, { migrationsFolder });
  else await migratePostgres(rawDb(), { migrationsFolder });
  console.log("✓ migrations applied");
}

async function ensureDemoUser() {
  const [existing] = await db.select().from(schema.user).where(eq(schema.user.email, DEMO.email)).limit(1);
  if (existing) return existing;
  const id = newId(24);
  const [user] = await db.insert(schema.user).values({ id, name: DEMO.name, email: DEMO.email, emailVerified: true }).returning();
  await db.insert(schema.account).values({
    id: newId(24),
    userId: id,
    accountId: id,
    providerId: "credential",
    password: await hashPassword(DEMO.password),
  });
  return user;
}

const PATIENTS = [
  ["Ma Hnin Wai", "09 420 111 222"],
  ["Ko Zaw Min", "09 795 333 444"],
  ["Daw Thida", "09 250 555 666"],
  ["U Kyaw Soe", "09 431 777 888"],
  ["Ma Ei Phyu", "09 962 123 987"],
  ["Ko Aung Ko", "09 883 456 321"],
  ["Ma Su Mon", "09 765 222 111"],
  ["Mg Htet Naing", "09 254 909 808"],
  ["Daw Mya Mya", "09 451 606 707"],
  ["Ko Thura", "09 977 313 414"],
] as const;

async function seed() {
  const [existing] = await db.select().from(schema.business).where(eq(schema.business.id, DEMO.businessId)).limit(1);
  if (existing) {
    await db.delete(schema.booking).where(eq(schema.booking.businessId, DEMO.businessId));
    await db.delete(schema.business).where(eq(schema.business.id, DEMO.businessId));
  }

  const owner = await ensureDemoUser();
  const theme = buildTheme({
    name: "Golden Lotus Clinic",
    background: "#fbfaf7",
    foreground: "#1f2937",
    primary: "#0f766e",
    fontFamily: "DM Sans",
    radius: 12,
  });
  const biz = await createBusiness({
    id: DEMO.businessId,
    slug: DEMO.slug,
    ownerId: owner.id,
    ownerName: `Dr. ${DEMO.name}`,
    name: "Golden Lotus Clinic",
    vertical: "clinic",
    timezone: "Asia/Yangon",
    phone: "09 123 456 789",
    theme,
  });
  await db
    .update(schema.business)
    .set({ address: "No. 42, Inya Road, Kamayut, Yangon", email: null, website: null })
    .where(eq(schema.business.id, biz.id));

  // Extra services beyond the clinic starters.
  const extra = await db
    .insert(schema.service)
    .values([
      { businessId: biz.id, name: "Child vaccination", nameMy: "ကလေး ကာကွယ်ဆေးထိုးခြင်း", durationMin: 15, price: 8000, sortOrder: 3 },
      { businessId: biz.id, name: "Dental check-up", nameMy: "သွားစစ်ဆေးခြင်း", durationMin: 30, price: 20000, sortOrder: 4 },
      { businessId: biz.id, name: "Teeth cleaning", nameMy: "သွားဆေးကြောခြင်း", durationMin: 45, bufferMin: 10, price: 35000, sortOrder: 5 },
    ])
    .returning();
  const services = await db.select().from(schema.service).where(eq(schema.service.businessId, biz.id));
  const byName = (n: string) => services.find((s) => s.name === n)!.id;

  const [gp] = await db.select().from(schema.provider).where(eq(schema.provider.businessId, biz.id));
  await db.update(schema.provider).set({ title: "General Practitioner", sortOrder: 0 }).where(eq(schema.provider.id, gp.id));

  const [dentist, pediatrician] = await db
    .insert(schema.provider)
    .values([
      { businessId: biz.id, name: "Dr. Min Thu", title: "Dentist", useBusinessHours: false, sortOrder: 1 },
      { businessId: biz.id, name: "Dr. Su Su Hlaing", title: "Pediatrician", sortOrder: 2 },
    ])
    .returning();
  await db.insert(schema.providerService).values([
    { providerId: dentist.id, serviceId: byName("Dental check-up") },
    { providerId: dentist.id, serviceId: byName("Teeth cleaning") },
    { providerId: pediatrician.id, serviceId: byName("General consultation") },
    { providerId: pediatrician.id, serviceId: byName("Follow-up visit") },
    { providerId: pediatrician.id, serviceId: byName("Child vaccination") },
  ]);
  // The dentist works Tue/Thu 10–16 and Saturday mornings.
  await db.insert(schema.schedule).values([
    { businessId: biz.id, providerId: dentist.id, weekday: 2, startMin: 600, endMin: 960 },
    { businessId: biz.id, providerId: dentist.id, weekday: 4, startMin: 600, endMin: 960 },
    { businessId: biz.id, providerId: dentist.id, weekday: 6, startMin: 540, endMin: 780 },
  ]);
  void extra;

  // Upcoming bookings through the real booking path (respects availability).
  const tz = biz.timezone;
  const today = dateInZone(new Date(), tz);
  let made = 0;
  let p = 0;
  let attempt = 0;
  for (let d = 0; d < 7; d++) {
    for (const svc of services) {
      const { days } = await getAvailability({ business: biz, serviceId: svc.id, fromDate: addDays(today, d), days: 1 });
      const slots = days[0].slots;
      // Take a couple of spread-out slots per service per day.
      for (const slot of [slots[1], slots[Math.floor(slots.length / 2) + 1]].filter(Boolean)) {
        if (attempt++ % 3 === 2) continue;
        const [name, phone] = PATIENTS[p++ % PATIENTS.length];
        try {
          const b = await createBooking({
            business: biz,
            serviceId: svc.id,
            providerId: null,
            start: slot.start,
            customer: { name, phone },
            locale: p % 3 === 0 ? "my" : "en",
            source: p % 4 === 0 ? "dashboard" : p % 2 ? "widget" : "page",
          });
          if (p % 5 === 0) await db.update(schema.booking).set({ status: "pending" }).where(eq(schema.booking.id, b.id));
          made++;
        } catch (err) {
          // Slot taken by an earlier seed booking; skip.
          if (process.env.DEBUG_SEED) console.warn((err as Error).message);
        }
      }
    }
  }

  // A little history for the customers list.
  const consult = byName("General consultation");
  for (let d = 1; d <= 10; d++) {
    const date = addDays(today, -d);
    const [name, phone] = PATIENTS[d % PATIENTS.length];
    const startsAt = zonedToUtc(date, d % 2 ? "10:00" : "14:20", tz);
    const [cust] = await db
      .insert(schema.customer)
      .values({ businessId: biz.id, name, phone: normalizePhone(phone) })
      .onConflictDoUpdate({ target: [schema.customer.businessId, schema.customer.phone], set: { name } })
      .returning();
    await db.insert(schema.booking).values({
      businessId: biz.id,
      serviceId: consult,
      providerId: gp.id,
      customerId: cust.id,
      startsAt,
      endsAt: new Date(startsAt.getTime() + 20 * 60_000),
      status: d % 4 === 0 ? "no_show" : "completed",
      source: "page",
      customerName: name,
      customerPhone: phone,
      locale: "en",
      manageToken: newToken(),
    });
  }

  console.log(`✓ seeded "${biz.name}" with ${made} upcoming bookings`);
  console.log(`  sign in: ${DEMO.email} (password in scripts/db.ts)`);
}

async function main() {
  const cmd = process.argv[2] ?? "setup";
  if (cmd === "reset") {
    if (!isPglite()) throw new Error("db:reset only wipes the local PGlite database. Drop your Postgres database manually.");
    await rm(PGLITE_DIR, { recursive: true, force: true });
    console.log("✓ local database removed");
  }
  await migrate();
  if (cmd === "seed") await seed();
  if (cmd === "setup" || cmd === "reset") {
    const [{ n }] = await db.select({ n: count() }).from(schema.business);
    if (Number(n) === 0) await seed();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
