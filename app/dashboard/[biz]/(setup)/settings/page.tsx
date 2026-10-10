import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page";
import { SettingsStack } from "@/components/ui/settings";
import { requireBusiness } from "@/lib/business/access";
import { DELETE_GRACE_DAYS } from "@/lib/business/settings";
import { getSiteCopy } from "@/lib/site-locale";
import { appUrl } from "@/lib/url";
import { DataControls } from "./data-controls";
import { ProfileSettings, RulesSettings } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.settings };
}

export default async function SettingsPage({ params }: PageProps<"/dashboard/[biz]/settings">) {
  const { biz } = await params;
  const [{ business, role }, { t }] = await Promise.all([requireBusiness(biz, "admin"), getSiteCopy()]);
  return (
    <SettingsStack>
      <PageHeader title={t.dash.settings.title} />
      {/* Keyed on the saved values: React resets a form to its first defaults after an
          action, so remount with the fresh ones once the save comes back. */}
      <ProfileSettings
        key={`${business.updatedAt.getTime()}`}
        slug={business.slug}
        bookingBase={appUrl("/b/")}
        values={{
          name: business.name,
          slug: business.slug,
          vertical: business.settings.vertical,
          timezone: business.timezone,
          phone: business.phone ?? "",
          email: business.email ?? "",
          address: business.address ?? "",
          website: business.website ?? "",
        }}
      />
      <RulesSettings key={JSON.stringify(business.settings)} slug={business.slug} settings={business.settings} />
      {role === "owner" ? <DataControls slug={business.slug} graceDays={DELETE_GRACE_DAYS} /> : null}
    </SettingsStack>
  );
}
