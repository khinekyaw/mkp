"use client";

import type { BookingApi } from "@/components/booking/api";
import { BookingWidget } from "@/components/booking/booking-widget";
import type { PublicBusiness } from "@/lib/business/public";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** The booking form on its own, in the theme being edited, at phone or desktop width. */
export function WidgetPreview({
  business,
  api,
  theme,
  device,
}: {
  business: PublicBusiness;
  api: BookingApi;
  theme: Theme;
  device: "desktop" | "mobile";
}) {
  return (
    <div className={cn("mx-auto w-full transition-[max-width] duration-300", device === "mobile" ? "max-w-[390px]" : "max-w-2xl")}>
      <BookingWidget business={business} api={api} theme={{ ...theme, name: theme.name ?? business.name }} className="shadow-sm" />
    </div>
  );
}
