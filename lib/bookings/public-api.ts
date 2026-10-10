import { z } from "zod";
import { PHONE_PATTERN } from "../phone";

/** Request/response contracts shared by the public API routes and the widget. */

export const availabilityQuerySchema = z.object({
  service: z.string().min(1),
  provider: z.string().min(1).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.coerce.number().int().min(1).max(31).default(14),
});

export type AvailabilityResponse = {
  timezone: string;
  days: { date: string; open: boolean; slots: { start: string }[] }[];
};

export const createBookingSchema = z.object({
  serviceId: z.string().min(1),
  providerId: z.string().min(1).nullable(),
  start: z.iso.datetime(),
  name: z.string().trim().min(2, "Please enter your name").max(80),
  phone: z.string().trim().regex(PHONE_PATTERN, "Please enter a valid phone number"),
  email: z.union([z.literal(""), z.email("Please enter a valid email")]).optional(),
  note: z.string().trim().max(500).optional(),
  locale: z.enum(["en", "my"]).default("en"),
  source: z.enum(["widget", "page"]).default("widget"),
  /** Honeypot: real people never fill this hidden field. */
  company: z.string().max(0).optional(),
  /** Cloudflare Turnstile response, when bot protection is configured. */
  turnstileToken: z.string().max(4096).optional(),
});

export type CreateBookingRequest = z.input<typeof createBookingSchema>;

export type BookingConfirmation = {
  id: string;
  status: "pending" | "confirmed";
  start: string;
  serviceId: string;
  providerName: string;
  manageUrl: string;
};

/** `code` lets the widget show its own translated message. */
export type ApiError = { error: string; code?: string; fields?: Record<string, string[] | undefined> };
