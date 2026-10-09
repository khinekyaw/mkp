import { redirect } from "next/navigation";
import { AuthPanel, SplitLayout } from "@/components/brand/split-layout";
import { SiteLocaleProvider } from "@/components/i18n/site-locale";
import { getSession } from "@/lib/business/access";
import { getSiteCopy } from "@/lib/site-locale";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await getSession()) redirect("/dashboard");
  const { locale, t } = await getSiteCopy();
  return (
    <SiteLocaleProvider locale={locale}>
      <div lang={locale}>
        <SplitLayout panel={<AuthPanel t={t} locale={locale} />}>
          <div className="w-full max-w-sm">{children}</div>
        </SplitLayout>
      </div>
    </SiteLocaleProvider>
  );
}
