import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { newId } from "../id";
import type { Theme } from "../theme/schema";
import type { BusinessSettings } from "../business/settings";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const id = () => text("id").primaryKey().$defaultFn(() => newId());

// ---------------------------------------------------------------------------
// Better Auth tables (shape required by the Drizzle adapter)
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  /** Platform role (Better Auth admin plugin): "admin" = super-admin. Unrelated to clinic membership roles. */
  role: text("role"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    /** Set when a platform admin is impersonating this user. */
    impersonatedBy: text("impersonated_by"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const twoFactor = pgTable(
  "two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (t) => [index("two_factor_user_idx").on(t.userId), index("two_factor_secret_idx").on(t.secret)],
);

/** Better Auth's own limiter (sign-in, sign-up, reset), shared across server instances. */
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

// ---------------------------------------------------------------------------
// Platform infrastructure
// ---------------------------------------------------------------------------

/** Fixed-window counters for our own limits (public API, theme detection), shared across instances. */
export const throttle = pgTable("throttle", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

/** Theme detection results per site, so repeat detections don't refetch the site or call the AI model. */
export const themeCache = pgTable("theme_cache", {
  key: text("key").primaryKey(),
  result: jsonb("result").notNull(),
  createdAt: createdAt(),
});

export const jobStatus = pgEnum("job_status", ["pending", "running", "done", "failed"]);

/** Background work (emails, reminders, purges) with retries; drained by the cron route. */
export const job = pgTable(
  "job",
  {
    id: id(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    /** Optional idempotency key: enqueueing the same key again replaces the pending job. */
    dedupeKey: text("dedupe_key").unique(),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    status: jobStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("job_due_idx").on(t.status, t.runAt)],
);

/** Platform-wide switches set from the super-admin (announcement banner, maintenance mode). */
export const platformSetting = pgTable("platform_setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// Tenancy
// ---------------------------------------------------------------------------

export const memberRole = pgEnum("member_role", ["owner", "admin", "staff"]);
/** Set by the platform, not the clinic. Suspended: booking page, embed and public API go dark; the dashboard still works. */
export const businessStatus = pgEnum("business_status", ["active", "suspended"]);

export const business = pgTable("business", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("Asia/Yangon"),
  website: text("website"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  theme: jsonb("theme").$type<Theme>(),
  settings: jsonb("settings").$type<BusinessSettings>().notNull(),
  status: businessStatus("status").notNull().default("active"),
  plan: text("plan").notNull().default("trial"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  /** Owner asked to delete the clinic; data is purged after a grace period. */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const membership = pgTable(
  "membership",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("staff"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("membership_business_user_idx").on(t.businessId, t.userId), index("membership_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Catalog & schedules
// ---------------------------------------------------------------------------

export const service = pgTable(
  "service",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Burmese display name; falls back to `name`. */
    nameMy: text("name_my"),
    description: text("description"),
    durationMin: integer("duration_min").notNull(),
    /** Cleanup/turnover time blocked after each appointment. */
    bufferMin: integer("buffer_min").notNull().default(0),
    /** Minor units of `currency` (MMK has none, so kyats). Null = don't show a price. */
    price: integer("price"),
    currency: text("currency").notNull().default("MMK"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("service_business_idx").on(t.businessId)],
);

/** A bookable person (doctor, dentist, stylist…). Optionally linked to a user account. */
export const provider = pgTable(
  "provider",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    title: text("title"),
    bio: text("bio"),
    /** When true, the provider works the business's opening hours. */
    useBusinessHours: boolean("use_business_hours").notNull().default(true),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("provider_business_idx").on(t.businessId)],
);

export const providerService = pgTable(
  "provider_service",
  {
    providerId: text("provider_id")
      .notNull()
      .references(() => provider.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.providerId, t.serviceId] })],
);

/** Weekly working interval. provider_id null = business opening hours. */
export const schedule = pgTable(
  "schedule",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    providerId: text("provider_id").references(() => provider.id, { onDelete: "cascade" }),
    /** 0 = Sunday … 6 = Saturday */
    weekday: smallint("weekday").notNull(),
    /** Minutes after local midnight. */
    startMin: integer("start_min").notNull(),
    endMin: integer("end_min").notNull(),
  },
  (t) => [index("schedule_business_idx").on(t.businessId, t.providerId)],
);

/** Absence or closure. provider_id null = whole business closed. */
export const timeOff = pgTable(
  "time_off",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    providerId: text("provider_id").references(() => provider.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
    createdAt: createdAt(),
  },
  (t) => [index("time_off_business_idx").on(t.businessId, t.startsAt)],
);

// ---------------------------------------------------------------------------
// Customers & bookings
// ---------------------------------------------------------------------------

export const customer = pgTable(
  "customer",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** Normalized digits-only phone; the identity key within a business. */
    phone: text("phone").notNull(),
    email: text("email"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("customer_business_phone_idx").on(t.businessId, t.phone),
    // Substring search (`ilike '%term%'`) in the customer list.
    index("customer_name_trgm_idx").using("gin", sql`${t.name} gin_trgm_ops`),
    index("customer_phone_trgm_idx").using("gin", sql`${t.phone} gin_trgm_ops`),
    index("customer_email_trgm_idx").using("gin", sql`${t.email} gin_trgm_ops`),
  ],
);

export const bookingStatus = pgEnum("booking_status", ["pending", "confirmed", "cancelled", "completed", "no_show"]);
export const bookingSource = pgEnum("booking_source", ["widget", "page", "dashboard"]);

export const booking = pgTable(
  "booking",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    serviceId: text("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "restrict" }),
    providerId: text("provider_id")
      .notNull()
      .references(() => provider.id, { onDelete: "restrict" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /** Snapshot of the service buffer, so later edits don't change past blocking. */
    bufferMin: integer("buffer_min").notNull().default(0),
    status: bookingStatus("status").notNull().default("confirmed"),
    source: bookingSource("source").notNull(),
    // Snapshot of what the patient entered, independent of later CRM edits.
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email"),
    note: text("note"),
    locale: text("locale").notNull().default("en"),
    manageToken: text("manage_token").notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    /** When the patient agreed to the privacy notice (online bookings only). */
    consentAt: timestamp("consent_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("booking_provider_time_idx").on(t.providerId, t.startsAt),
    index("booking_business_time_idx").on(t.businessId, t.startsAt),
    index("booking_customer_idx").on(t.customerId),
    index("booking_active_idx")
      .on(t.providerId, t.startsAt)
      .where(sql`${t.status} in ('pending', 'confirmed')`),
    // Substring search in the appointments list.
    index("booking_customer_name_trgm_idx").using("gin", sql`${t.customerName} gin_trgm_ops`),
    index("booking_customer_phone_trgm_idx").using("gin", sql`${t.customerPhone} gin_trgm_ops`),
  ],
);

/** Pending team invite; the token travels only in the emailed link. */
export const invitation = pgTable(
  "invitation",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRole("role").notNull().default("staff"),
    token: text("token").notNull().unique(),
    invitedBy: text("invited_by").references(() => user.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("invitation_business_idx").on(t.businessId)],
);

export const auditActor = pgEnum("audit_actor", ["user", "patient", "admin", "system"]);

/**
 * Who changed what. Clinic events carry a business id; platform-admin actions
 * (including impersonation, with the stated reason in `data`) use actor "admin".
 */
export const auditEvent = pgTable(
  "audit_event",
  {
    id: id(),
    businessId: text("business_id").references(() => business.id, { onDelete: "cascade" }),
    actorType: auditActor("actor_type").notNull(),
    actorId: text("actor_id"),
    actorName: text("actor_name"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_business_time_idx").on(t.businessId, t.createdAt),
    index("audit_target_idx").on(t.targetType, t.targetId),
    index("audit_actor_time_idx").on(t.actorType, t.createdAt),
  ],
);

/** Manually recorded subscription payments (bank/KBZPay/Wave transfers) until online billing exists. */
export const payment = pgTable(
  "payment",
  {
    id: id(),
    businessId: text("business_id")
      .notNull()
      .references(() => business.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("MMK"),
    method: text("method").notNull(),
    reference: text("reference"),
    /** The plan is paid up to this moment. */
    paidUntil: timestamp("paid_until", { withTimezone: true }).notNull(),
    note: text("note"),
    recordedBy: text("recorded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("payment_business_idx").on(t.businessId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Relations (for db.query.*)
// ---------------------------------------------------------------------------

export const businessRelations = relations(business, ({ many }) => ({
  memberships: many(membership),
  services: many(service),
  providers: many(provider),
  schedules: many(schedule),
}));

export const membershipRelations = relations(membership, ({ one }) => ({
  business: one(business, { fields: [membership.businessId], references: [business.id] }),
  user: one(user, { fields: [membership.userId], references: [user.id] }),
}));

export const serviceRelations = relations(service, ({ one, many }) => ({
  business: one(business, { fields: [service.businessId], references: [business.id] }),
  providers: many(providerService),
}));

export const providerRelations = relations(provider, ({ one, many }) => ({
  business: one(business, { fields: [provider.businessId], references: [business.id] }),
  services: many(providerService),
  schedules: many(schedule),
}));

export const providerServiceRelations = relations(providerService, ({ one }) => ({
  provider: one(provider, { fields: [providerService.providerId], references: [provider.id] }),
  service: one(service, { fields: [providerService.serviceId], references: [service.id] }),
}));

export const scheduleRelations = relations(schedule, ({ one }) => ({
  provider: one(provider, { fields: [schedule.providerId], references: [provider.id] }),
}));

export const customerRelations = relations(customer, ({ many }) => ({
  bookings: many(booking),
}));

export const bookingRelations = relations(booking, ({ one }) => ({
  service: one(service, { fields: [booking.serviceId], references: [service.id] }),
  provider: one(provider, { fields: [booking.providerId], references: [provider.id] }),
  customer: one(customer, { fields: [booking.customerId], references: [customer.id] }),
  business: one(business, { fields: [booking.businessId], references: [business.id] }),
}));

export type Business = typeof business.$inferSelect;
export type Service = typeof service.$inferSelect;
export type Provider = typeof provider.$inferSelect;
export type Schedule = typeof schedule.$inferSelect;
export type TimeOff = typeof timeOff.$inferSelect;
export type Customer = typeof customer.$inferSelect;
export type Booking = typeof booking.$inferSelect;
export type BookingStatus = (typeof bookingStatus.enumValues)[number];
export type MemberRole = (typeof memberRole.enumValues)[number];
export type Job = typeof job.$inferSelect;
export type AuditActor = (typeof auditActor.enumValues)[number];
export type BusinessStatus = (typeof businessStatus.enumValues)[number];
