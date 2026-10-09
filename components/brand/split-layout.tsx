import type { ReactNode } from "react";
import { Phrases } from "@/components/i18n/phrases";
import { LanguageSwitch } from "@/components/i18n/site-locale";
import type { Locale } from "@/lib/i18n";
import type { SiteCopy } from "@/lib/site-copy";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

/**
 * Auth and onboarding shell: a sage panel beside a white form card on the grey
 * canvas. On phones the panel is hidden and the logo sits above the form.
 */
export function SplitLayout({ panel, logoHref, children }: { panel: ReactNode; logoHref?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh gap-3 bg-canvas p-3 sm:gap-4 sm:p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <aside className="sage-glow hidden flex-col gap-10 rounded-[2rem] p-8 text-white lg:flex xl:p-10">
        <div className="w-fit rounded-full bg-background p-1.5 pr-4">
          <Logo href={logoHref} />
        </div>
        <div className="grid flex-1 content-center">{panel}</div>
      </aside>
      <main className="relative grid content-start justify-items-center gap-8 rounded-[2rem] bg-background px-4 py-6 sm:px-8 lg:content-center lg:py-16">
        <div className="flex w-full items-center justify-between gap-3 lg:absolute lg:top-6 lg:right-6 lg:w-auto">
          <Logo href={logoHref} className="lg:hidden" />
          <LanguageSwitch />
        </div>
        {children}
      </main>
    </div>
  );
}

/** The promise shown beside sign-in and sign-up. */
export function AuthPanel({ t, locale }: { t: SiteCopy; locale: Locale }) {
  return (
    <div className="grid max-w-md gap-8">
      {/* Burmese runs long and stacks tall, so it steps down a size. */}
      <h2 className={cn("leading-[1.02] font-medium tracking-[-0.035em]", locale === "my" ? "text-3xl" : "text-5xl")}><Phrases text={t.auth.panelTitle} /></h2>
      <ul className="grid gap-2 text-sm">
        {t.auth.panelRows.map((row) => (
          <li key={row} className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
            {row}
          </li>
        ))}
      </ul>
      <p className="text-xs text-white/75">{t.auth.panelNote}</p>
    </div>
  );
}
