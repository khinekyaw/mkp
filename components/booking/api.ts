import type { AvailabilityResponse, BookingConfirmation, CreateBookingRequest } from "@/lib/bookings/public-api";
import type { PublicBusiness } from "@/lib/business/public";
import { addDays, dateInZone, timeOf, weekday, zonedToUtc } from "@/lib/scheduling/time";

export type AvailabilityQuery = { serviceId: string; providerId: string | null; from: string; days: number };
export type BookResult =
  | { ok: true; booking: BookingConfirmation }
  | { ok: false; status: number; error: string; code?: string; fields?: Record<string, string[] | undefined> };

/** The widget's only dependency on the outside world, so it can run live, in preview, or as an offline demo. */
export interface BookingApi {
  availability(query: AvailabilityQuery): Promise<AvailabilityResponse>;
  book(request: CreateBookingRequest): Promise<BookResult>;
}

export function httpApi(businessId: string, base = ""): BookingApi {
  const root = `${base}/api/public/b/${encodeURIComponent(businessId)}`;
  return {
    async availability({ serviceId, providerId, from, days }) {
      const params = new URLSearchParams({ service: serviceId, from, days: String(days) });
      if (providerId) params.set("provider", providerId);
      const res = await fetch(`${root}/availability?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`availability ${res.status}`);
      return res.json();
    },
    async book(request) {
      try {
        const res = await fetch(`${root}/bookings`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(request),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "Something went wrong.", code: json.code, fields: json.fields };
        return { ok: true, booking: json.booking };
      } catch {
        return { ok: false, status: 0, error: "Network error. Please try again." };
      }
    },
  };
}

/** Real availability, simulated booking: for previews inside the dashboard. */
export function previewApi(inner: BookingApi): BookingApi {
  return {
    availability: (q) => inner.availability(q),
    async book(request) {
      await new Promise((r) => setTimeout(r, 400));
      return {
        ok: true,
        booking: { id: "preview", status: "confirmed", start: request.start, serviceId: request.serviceId, providerName: "", manageUrl: "" },
      };
    },
  };
}

/** Fully offline availability for marketing demos (no database, nothing is saved). */
export function demoApi(business: Pick<PublicBusiness, "timezone" | "services">): BookingApi {
  // Deterministic "taken" pattern so the demo looks realistic but stable.
  const taken = (iso: string) => {
    let h = 0;
    for (const c of iso) h = (h * 31 + c.charCodeAt(0)) | 0;
    return Math.abs(h) % 10 < 3;
  };
  return {
    async availability({ serviceId, from, days }) {
      const tz = business.timezone;
      const duration = business.services.find((s) => s.id === serviceId)?.durationMin ?? 30;
      const now = Date.now();
      const today = dateInZone(new Date(), tz);
      const out: AvailabilityResponse["days"] = [];
      for (let i = 0; i < days; i++) {
        const date = addDays(from, i);
        const wd = weekday(date);
        const open = wd !== 0 && date >= today;
        const close = wd === 6 ? 13 * 60 : 17 * 60;
        const slots: { start: string }[] = [];
        if (open) {
          for (let m = 9 * 60; m + duration <= close; m += 30) {
            if (m >= 12 * 60 && m < 13 * 60) continue;
            const start = zonedToUtc(date, timeOf(m), tz);
            if (start.getTime() < now + 3_600_000 || taken(start.toISOString())) continue;
            slots.push({ start: start.toISOString() });
          }
        }
        out.push({ date, open, slots });
      }
      await new Promise((r) => setTimeout(r, 150));
      return { timezone: tz, days: out };
    },
    async book(request) {
      await new Promise((r) => setTimeout(r, 500));
      return {
        ok: true,
        booking: { id: "demo", status: "confirmed", start: request.start, serviceId: request.serviceId, providerName: "", manageUrl: "" },
      };
    },
  };
}

