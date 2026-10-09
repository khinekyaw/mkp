import { ArrowDown, ArrowRight, CalendarDays, Code2, Languages, Link2, MailCheck, ShieldCheck, Stethoscope } from "lucide-react";
import Link from "next/link";
import { BookingDemo } from "@/components/marketing/booking-demo";
import { DEMO_BUSINESS } from "@/components/marketing/demo-business";
import { pillCta, pillOnGlow, pillSecondary } from "@/components/marketing/styles";
import { StudioCta } from "@/components/marketing/studio-cta";
import { Studio } from "@/components/studio/studio";
import { Phrases } from "@/components/i18n/phrases";
import { getSiteCopy } from "@/lib/site-locale";
import { DEFAULT_THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Icons for the front-desk features, in the order of t.features.items.
const DESK_ICONS = [Link2, Languages, Stethoscope, ShieldCheck, CalendarDays, MailCheck, Code2];

export default async function LandingPage() {
  const { locale, t } = await getSiteCopy();
  // Burmese words run long and stack tall: headings step down a size.
  const my = locale === "my";
  return (
    <>
      {/* First viewport: the promise beside a working booking card. */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] lg:gap-14 lg:pt-20 lg:pb-16">
        <div className="grid content-center gap-6">
          <h1
            className={cn(
              "leading-[1.02] font-medium tracking-[-0.035em]",
              my ? "max-w-[22ch] text-[clamp(1.9rem,3.4vw,2.9rem)]" : "max-w-[15ch] text-[clamp(2.6rem,5.6vw,4.5rem)]",
            )}
          >
            <Phrases text={t.hero.title} />
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">{t.hero.body}</p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link href="/sign-up" className={pillCta()}>
              {t.hero.cta} <ArrowRight />
            </Link>
            <a href="#match" className={pillSecondary()}>
              {t.hero.seeMatch} <ArrowDown />
            </a>
          </div>
          <p className="text-xs text-muted-foreground">{t.hero.note}</p>
        </div>
        <div className="sage-glow rounded-[2rem] p-3 sm:p-5">
          <BookingDemo />
        </div>
      </section>

      <section id="match" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-6 sm:px-6">
        <div className="grid gap-8 rounded-[2rem] bg-background p-5 sm:p-8 lg:p-10">
          <div className="grid max-w-2xl gap-3">
            <h2 className={cn("leading-[1.05] font-medium tracking-[-0.03em]", my ? "text-[clamp(1.5rem,2.6vw,2.1rem)]" : "text-[clamp(2rem,4vw,3rem)]")}>
              <Phrases text={t.match.title} />
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">{t.match.body}</p>
          </div>
          {/* The key keeps React's list-key check quiet: this element is created
              here on the server and rendered among Studio's own children. */}
          <Studio business={DEMO_BUSINESS} mode="demo" initialTheme={DEFAULT_THEME} footer={<StudioCta key="studio-cta" />} />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-6 sm:px-6">
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <li className="sage-glow grid content-between gap-8 rounded-[1.5rem] p-6 text-white md:col-span-2 sm:p-8">
            <h2
              className={cn(
                "leading-[1.05] font-medium tracking-[-0.03em]",
                my ? "text-[clamp(1.5rem,2.6vw,2.1rem)]" : "max-w-[14ch] text-[clamp(2rem,4vw,3rem)]",
              )}
            >
              <Phrases text={t.features.title} />
            </h2>
            <p className="max-w-md text-base leading-relaxed text-white/85">{t.features.body}</p>
          </li>
          {t.features.items.map(({ term, detail }, i) => {
            const Icon = DESK_ICONS[i];
            return (
              <li key={i} className={i === t.features.items.length - 1 ? "md:col-span-2 lg:col-span-1" : undefined}>
                <div className="grid h-full content-start gap-4 rounded-[1.5rem] bg-background p-6">
                  <span className="grid size-11 place-items-center rounded-full ring-2 ring-border">
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="grid gap-1.5">
                    <h3 className="text-base font-medium">{term}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{detail}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:px-6 sm:pb-14">
        <div className="sage-glow grid gap-6 rounded-[2rem] px-6 py-10 text-white sm:px-12 sm:py-14 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-2">
            <h2 className={cn("leading-none font-medium tracking-[-0.035em]", my ? "text-[clamp(1.8rem,3.6vw,2.75rem)]" : "text-[clamp(2.4rem,6vw,4.5rem)]")}>
              <Phrases text={t.closing.title} />
            </h2>
            <p className="pt-2 text-base text-white/85">{t.closing.body}</p>
          </div>
          <Link href="/sign-up" className={pillOnGlow}>
            {t.hero.cta} <ArrowRight />
          </Link>
        </div>
      </section>
    </>
  );
}
