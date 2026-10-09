import { TopNav } from "@/components/dashboard/top-nav";
import { SiteLocaleProvider } from "@/components/i18n/site-locale";
import { Toaster } from "@/components/ui/toaster";
import { listMemberships, requireBusiness } from "@/lib/business/access";
import { getSiteLocale } from "@/lib/site-locale";

export default async function BusinessLayout({ children, params }: LayoutProps<"/dashboard/[biz]">) {
  const { biz } = await params;
  const [{ business, user, role }, locale] = await Promise.all([requireBusiness(biz), getSiteLocale()]);
  const memberships = await listMemberships(user.id);

  return (
    <SiteLocaleProvider locale={locale}>
      <div lang={locale} className="min-h-dvh bg-canvas">
        <TopNav
          business={{ slug: business.slug, name: business.name }}
          businesses={memberships.map((m) => m.business)}
          user={{ name: user.name, email: user.email }}
          role={role}
        />
        <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 pt-6 pb-12 sm:px-6 lg:px-8 lg:pt-10">{children}</main>
        <Toaster />
      </div>
    </SiteLocaleProvider>
  );
}
