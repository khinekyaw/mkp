import type { Metadata } from "next";
import { TimeOffManager } from "@/components/dashboard/time-off-manager";
import { PageHeader } from "@/components/ui/page";
import { SettingsSection, SettingsStack } from "@/components/ui/settings";
import { requireBusiness } from "@/lib/business/access";
import { getBusinessHours, listTimeOff } from "@/lib/dashboard/queries";
import { dateInZone } from "@/lib/scheduling/time";
import { getSiteCopy } from "@/lib/site-locale";
import { HoursForm } from "./hours-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.hours };
}

export default async function HoursPage({ params }: PageProps<"/dashboard/[biz]/hours">) {
  const { biz } = await params;
  const [{ business }, { t }] = await Promise.all([requireBusiness(biz, "admin"), getSiteCopy()]);
  const h = t.dash.hours;
  const [hours, closures] = await Promise.all([getBusinessHours(business.id), listTimeOff(business.id, { providerId: null })]);

  return (
    <SettingsStack>
      <PageHeader title={h.title} description={h.allTimesIn(business.timezone.replace(/_/g, " "))} />
      <SettingsSection title={h.opening} description={h.openingBody}>
        <div className="p-5">
          <HoursForm slug={business.slug} initial={hours} />
        </div>
      </SettingsSection>
      <SettingsSection title={h.closures} description={h.closuresBody}>
        <div className="p-5">
          <TimeOffManager
            slug={business.slug}
            timezone={business.timezone}
            entries={closures}
            today={dateInZone(new Date(), business.timezone)}
            emptyLabel={h.noClosures}
          />
        </div>
      </SettingsSection>
    </SettingsStack>
  );
}
