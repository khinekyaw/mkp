import { ArrowRight, CalendarDays, Check, Code2, Languages, Link2, MailCheck, Play, ShieldCheck, Stethoscope } from "lucide-react";
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
      {/* First viewport: the promise beside a working booking card. Clipped
          sideways so the backdrop's blobs never widen the page. */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 overflow-x-clip px-4 pt-12 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-16 lg:pt-20 lg:pb-16">
        <div className="grid content-center gap-6">
          <p className="flex items-center gap-3 text-xs font-medium tracking-[0.18em] text-sage-deep uppercase">
            {t.hero.eyebrow}
            <span aria-hidden className="h-px w-12 bg-sage-deep/40" />
          </p>
          <h1
            className={cn(
              "font-medium tracking-[-0.035em]",
              my ? "max-w-[22ch] text-[clamp(1.9rem,3.4vw,2.9rem)]" : "max-w-[16ch] text-[clamp(2.6rem,5.6vw,4.5rem)]",
              // After the size: tailwind-merge drops a line-height set before an arbitrary text size.
              "leading-[1.04]",
            )}
          >
            {t.hero.title.before ? <Phrases text={t.hero.title.before} /> : null}{" "}
            <span className="swoosh text-sage-deep">
              <Phrases text={t.hero.title.accent} />
            </span>{" "}
            {t.hero.title.after ? <Phrases text={t.hero.title.after} /> : null}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">{t.hero.body}</p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link href="/sign-up" className={pillCta()}>
              {t.hero.cta} <ArrowRight />
            </Link>
            <a href="#match" className={cn(pillSecondary(), "pl-2.5 ring-1 ring-border")}>
              <span aria-hidden className="grid size-7 place-items-center rounded-full bg-sage-deep text-white">
                <Play className="size-3 translate-x-px fill-current" />
              </span>
              {t.hero.seeMatch}
            </a>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-sm text-muted-foreground">
            {t.hero.points.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <span aria-hidden className="grid size-5 place-items-center rounded-full bg-sage-deep text-white">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <BookingDemo className="gap-8 lg:-mr-2" backdrop={<HeroBackdrop />} />
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

/** Organic sage shapes and marks behind the hero's booking card. */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute -inset-x-3 -top-8 -bottom-6 -z-10 sm:-inset-x-8 sm:-top-12">
      <div className="absolute bottom-0 -left-2 h-3/5 w-1/2 rounded-[58%_42%_48%_52%/52%_46%_54%_48%] bg-sage-soft/70" />
      <div className="sage-glow absolute inset-y-0 right-0 left-[22%] rounded-[46%_54%_40%_60%/34%_42%_58%_66%]" />
      <svg viewBox="0 0 40 40" className="absolute -top-3 right-1 size-10 text-sage-deep sm:-right-3">
        <path d="M8 18 L3 13 M18 12 L19 3 M28 16 L35 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <svg viewBox="0 0 40 40" className="absolute right-2 -bottom-8 size-12 text-sage-soft sm:-right-6">
        {[6, 20, 34].flatMap((x) => [6, 20, 34].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="currentColor" />))}
      </svg>
    </div>
  );
}
