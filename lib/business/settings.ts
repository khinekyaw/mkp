import { z } from "zod";

export const VERTICALS = ["clinic", "dental", "salon", "spa", "other"] as const;
export type Vertical = (typeof VERTICALS)[number];

export const businessSettingsSchema = z.object({
  vertical: z.enum(VERTICALS).default("clinic"),
  /** Languages offered in the widget; first is the default. */
  locales: z.array(z.enum(["en", "my"])).min(1).default(["en", "my"]),
  /** Minimum notice before a slot can be booked. */
  leadMinutes: z.number().int().min(0).max(60 * 24 * 14).default(60),
  /** How far ahead patients can book. */
  horizonDays: z.number().int().min(1).max(180).default(30),
  /** Spacing between offered start times. */
  slotIntervalMin: z.number().int().min(5).max(240).default(30),
  /** New online bookings start as "pending" until staff confirm them. */
  requireConfirmation: z.boolean().default(false),
  /** Patients may cancel online until this many hours before the appointment. */
  cancelNoticeHours: z.number().int().min(0).max(24 * 14).default(12),
  /** Let patients pick a specific provider (otherwise always "any available"). */
  allowProviderChoice: z.boolean().default(true),
});

export type BusinessSettings = z.infer<typeof businessSettingsSchema>;

export const DEFAULT_SETTINGS: BusinessSettings = businessSettingsSchema.parse({});

/** Parses stored settings, filling in defaults for fields added after creation. */
export function readSettings(raw: unknown): BusinessSettings {
  const result = businessSettingsSchema.safeParse(raw ?? {});
  return result.success ? result.data : DEFAULT_SETTINGS;
}

export const PROVIDER_LABEL: Record<Vertical, { en: string; my: string }> = {
  clinic: { en: "Doctor", my: "ဆရာဝန်" },
  dental: { en: "Dentist", my: "သွားဆရာဝန်" },
  salon: { en: "Stylist", my: "ဆံပင်ညှပ်သူ" },
  spa: { en: "Therapist", my: "ကုထုံးပညာရှင်" },
  other: { en: "Staff", my: "ဝန်ထမ်း" },
};

/** Clinics deleted by their owner are kept this long in case it was a mistake. */
export const DELETE_GRACE_DAYS = 30;
