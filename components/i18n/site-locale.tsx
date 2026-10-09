"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useTransition, type ReactNode } from "react";
import { LOCALES, LOCALE_LABEL, type Locale } from "@/lib/i18n";
import { SITE_COPY, type SiteCopy } from "@/lib/site-copy";
import { setSiteLocaleAction } from "@/lib/site-locale-action";
import { cn } from "@/lib/utils";

const SiteLocaleContext = createContext<{ locale: Locale; t: SiteCopy }>({ locale: "en", t: SITE_COPY.en });

/** Provides the site copy to client components; English when absent (dashboard). */
export function SiteLocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <SiteLocaleContext.Provider value={{ locale, t: SITE_COPY[locale] }}>{children}</SiteLocaleContext.Provider>;
}

export function useSiteCopy() {
  return useContext(SiteLocaleContext);
}

/** EN / မြန်မာ toggle. Stores the choice in a cookie and re-renders the page. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, t } = useSiteCopy();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setSiteLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div role="group" aria-label={t.nav.language} className={cn("inline-flex shrink-0 rounded-full bg-muted p-1", pending && "opacity-60", className)}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          onClick={() => choose(l)}
          className={cn(
            "h-8 cursor-pointer rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            l === locale && "bg-background text-foreground shadow-sm",
          )}
        >
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
