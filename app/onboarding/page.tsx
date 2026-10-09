import type { Metadata } from "next";
import { SiteLocaleProvider } from "@/components/i18n/site-locale";
import { requireUser } from "@/lib/business/access";
import { getSiteLocale } from "@/lib/site-locale";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your business" };

export default async function OnboardingPage() {
  const [user, locale] = await Promise.all([requireUser(), getSiteLocale()]);
  return (
    <SiteLocaleProvider locale={locale}>
      <div lang={locale}>
        <OnboardingForm userName={user.name} />
      </div>
    </SiteLocaleProvider>
  );
}
