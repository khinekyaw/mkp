import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { TopNav } from "@/components/dashboard/top-nav";
import { SiteLocaleProvider } from "@/components/i18n/site-locale";
import { Toaster } from "@/components/ui/toaster";
import { getSession, listMemberships, requireBusiness } from "@/lib/business/access";
import { getPlatformSettings } from "@/lib/platform";
import { getSiteCopy } from "@/lib/site-locale";

export default async function BusinessLayout({ children, params }: LayoutProps<"/dashboard/[biz]">) {
  const { biz } = await params;
  const [{ business, user, role }, { t, locale }] = await Promise.all([requireBusiness(biz), getSiteCopy()]);
  const [memberships, session, platform] = await Promise.all([listMemberships(user.id), getSession(), getPlatformSettings()]);
  const announcement = platform.announcement[locale] || platform.announcement.en;

  return (
    <SiteLocaleProvider locale={locale}>
      <div lang={locale} className="min-h-dvh bg-canvas">
        <TopNav
          business={{ slug: business.slug, name: business.name }}
          businesses={memberships.map((m) => m.business)}
          user={{ name: user.name, email: user.email, platformAdmin: user.role === "admin" }}
          role={role}
        />
        <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 pt-6 pb-12 sm:px-6 lg:px-8 lg:pt-10">
          {session?.session.impersonatedBy ? <ImpersonationBanner name={user.name} /> : null}
          {announcement ? (
            <p role="status" className="rounded-lg bg-tone-blue-soft px-4 py-3 text-sm text-tone-blue">
              {announcement}
            </p>
          ) : null}
          {business.status === "suspended" ? (
            <p role="status" className="rounded-lg bg-tone-red-soft px-4 py-3 text-sm text-tone-red">
              {t.dash.suspended}
            </p>
          ) : null}
          {children}
        </main>
        <Toaster />
      </div>
    </SiteLocaleProvider>
  );
}
