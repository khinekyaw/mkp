import { Phone } from "lucide-react";
import { MESSAGES, type Locale } from "@/lib/i18n";
import type { Theme } from "@/lib/theme";
import { ThemeScope } from "./theme-scope";

/** Shown instead of the booking form when a clinic's online booking is paused. */
export function BookingUnavailable({
  notice,
  locale,
  className,
}: {
  notice: { name: string; phone: string | null; theme: Theme };
  locale: Locale;
  className?: string;
}) {
  const t = MESSAGES[locale];
  const tel = notice.phone?.replace(/[^\d+]/g, "");
  return (
    <ThemeScope theme={notice.theme} lang={locale} className={className}>
      <div className="mx-auto grid max-w-md gap-3 px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">{notice.name}</p>
        <h1 className="text-xl font-semibold tracking-tight">{t.unavailableTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.unavailableBody}</p>
        {notice.phone ? (
          <a href={`tel:${tel}`} className="mx-auto inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-muted">
            <Phone className="size-4" /> {t.call} {notice.phone}
          </a>
        ) : null}
      </div>
    </ThemeScope>
  );
}
