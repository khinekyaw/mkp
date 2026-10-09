"use client";

import { useEffect, useRef } from "react";
import { LiveWidget } from "@/components/booking/live-widget";
import type { PublicBusiness } from "@/lib/business/public";
import type { Locale } from "@/lib/i18n";

/** Runs inside the iframe: reports its height and booking events to the host page. */
export function EmbeddedWidget({ business, locale }: { business: PublicBusiness; locale: Locale }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.parent === window) return;
    const post = () =>
      window.parent.postMessage({ type: "bw:resize", height: Math.ceil(el.getBoundingClientRect().height) }, "*");
    const observer = new ResizeObserver(post);
    observer.observe(el);
    post();
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="p-px">
      <LiveWidget
        business={business}
        locale={locale}
        source="widget"
        onBooked={(b) => {
          // Only non-personal fields leave the iframe; the host origin is unknown.
          window.parent.postMessage({ type: "bw:booked", booking: { id: b.id, start: b.start, serviceId: b.serviceId } }, "*");
        }}
      />
    </div>
  );
}
