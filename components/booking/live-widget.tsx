"use client";

import { useMemo } from "react";
import type { BookingConfirmation } from "@/lib/bookings/public-api";
import type { PublicBusiness } from "@/lib/business/public";
import type { Locale } from "@/lib/i18n";
import { httpApi } from "./api";
import { BookingWidget } from "./booking-widget";

/** The widget wired to the real public API (server components can't pass the API object). */
export function LiveWidget({
  business,
  locale,
  source,
  className,
  onBooked,
}: {
  business: PublicBusiness;
  locale?: Locale;
  source: "widget" | "page";
  className?: string;
  onBooked?: (booking: BookingConfirmation) => void;
}) {
  const api = useMemo(() => httpApi(business.id), [business.id]);
  return (
    <BookingWidget business={business} api={api} locale={locale} source={source} className={className} onBooked={onBooked} live />
  );
}
