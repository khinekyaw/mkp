import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { floatingBar } from "@/components/brand/styles";
import { LanguageSwitch, SiteLocaleProvider } from "@/components/i18n/site-locale";
import { pillCta } from "@/components/marketing/styles";
import { Toaster } from "@/components/ui/toaster";
import { getSession } from "@/lib/business/access";
import { getSiteCopy } from "@/lib/site-locale";
import { cn } from "@/lib/utils";

export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const [session, { locale, t }] = await Promise.all([getSession(), getSiteCopy()]);
  const nav = [
    { href: "/#match", label: t.nav.brandMatching },
    { href: "/#features", label: t.nav.features },
    { href: "/b/golden-lotus", label: t.nav.samplePage },
  ];
  return (
    <SiteLocaleProvider locale={locale}>
      <div lang={locale} className="flex min-h-dvh flex-col bg-canvas">
        <div className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
          <header className={cn("mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full p-2 pl-2", floatingBar)}>
            <Logo compact />
            <nav aria-label="Site" className="hidden items-center gap-0.5 rounded-full bg-muted p-1 md:flex">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-1">
              <LanguageSwitch className="mr-1" />
              {session ? (
                <Link href="/dashboard" className={cn(pillCta("md"), "whitespace-nowrap")}>
                  {t.nav.openDashboard}
                </Link>
              ) : (
                <>
                  <Link href="/sign-in" className="hidden rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:block">
                    {t.nav.signIn}
                  </Link>
                  <Link href="/sign-up" className={cn(pillCta("md"), "whitespace-nowrap")}>
                    {t.nav.getStarted}
                  </Link>
                </>
              )}
            </div>
          </header>
        </div>
        <main className="flex-1">{children}</main>
        <footer className="px-3 pb-3 sm:px-6 sm:pb-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-[1.25rem] bg-background px-5 py-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Booking Widget · {t.footer.madeFor}</span>
            <span className="flex gap-5">
              <Link href="/b/golden-lotus" className="hover:text-foreground">
                {t.footer.samplePage}
              </Link>
              <Link href="/sign-in" className="hover:text-foreground">
                {t.footer.signIn}
              </Link>
            </span>
          </div>
        </footer>
        <Toaster />
      </div>
    </SiteLocaleProvider>
  );
}
