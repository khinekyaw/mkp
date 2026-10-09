"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { cn } from "@/lib/utils";
import { lastSetupKey, SETUP_PAGES } from "./setup-pages";

/**
 * The setup section's sub-menu: a sticky list beside the page on desktop, a
 * scrolling row of pills on phones. Also remembers the page you're on so the
 * header's Setup tab can bring you back to it.
 */
export function SetupNav({ slug }: { slug: string }) {
  const { t } = useSiteCopy();
  const pathname = usePathname();
  const base = `/dashboard/${slug}`;
  const active = SETUP_PAGES.find((p) => pathname.startsWith(base + p.href));

  useEffect(() => {
    if (!active) return;
    try {
      localStorage.setItem(lastSetupKey(slug), active.href);
    } catch {
      // Storage can be unavailable (private mode); the tab then opens Services.
    }
  }, [active, slug]);

  return (
    <nav
      aria-label={t.dash.nav.setup}
      className="-mx-4 flex gap-1 overflow-x-auto px-4 scrollbar-none sm:-mx-6 sm:px-6 lg:sticky lg:top-24 lg:mx-0 lg:grid lg:gap-0.5 lg:overflow-visible lg:rounded-lg lg:bg-background lg:p-1.5"
    >
      {SETUP_PAGES.map((p) => {
        const current = p === active;
        return (
          <Link
            key={p.href}
            href={base + p.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:rounded-[0.875rem] lg:px-3 lg:py-2.5 [&_svg]:size-4 [&_svg]:shrink-0",
              current
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground lg:bg-transparent lg:hover:bg-muted",
            )}
          >
            <p.icon aria-hidden />
            {t.dash.nav[p.key]}
          </Link>
        );
      })}
    </nav>
  );
}
