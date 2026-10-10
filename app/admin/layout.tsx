import type { Metadata } from "next";
import Link from "next/link";
import { TwoFactorSettings } from "@/components/account/forms";
import { floatingBar } from "@/components/brand/styles";
import { LanguageSwitch, SiteLocaleProvider } from "@/components/i18n/site-locale";
import { Toaster } from "@/components/ui/toaster";
import { requirePlatformAdmin } from "@/lib/admin/access";
import { getSiteCopy } from "@/lib/site-locale";
import { cn } from "@/lib/utils";
import { AdminNav } from "./ui";

export const metadata: Metadata = { title: { default: "Platform admin", template: "%s · Platform admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [{ needs2fa }, { t, locale }] = await Promise.all([requirePlatformAdmin(), getSiteCopy()]);
  return (
    <SiteLocaleProvider locale={locale}>
      <div lang={locale} className="min-h-dvh bg-canvas">
        <div className="sticky top-0 z-40 px-3 pt-3 sm:px-6 lg:px-8">
          <header className={cn("mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2 rounded-[1.75rem] p-2 lg:rounded-full", floatingBar)}>
            <span className="px-3 text-sm font-semibold">{t.admin.title}</span>
            <div className="order-last w-full lg:order-none lg:w-auto lg:flex-1">{needs2fa ? null : <AdminNav />}</div>
            <div className="ml-auto flex items-center gap-2">
              <LanguageSwitch />
              <Link href="/dashboard" className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                {t.admin.nav.backToDashboard}
              </Link>
            </div>
          </header>
        </div>
        <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 pt-6 pb-12 sm:px-6 lg:px-8 lg:pt-10">
          {needs2fa ? (
            <div className="grid max-w-lg gap-4 rounded-lg border bg-background p-6">
              <p className="text-sm">{t.admin.need2fa}</p>
              <TwoFactorSettings enabled={false} />
            </div>
          ) : (
            children
          )}
        </main>
        <Toaster />
      </div>
    </SiteLocaleProvider>
  );
}
