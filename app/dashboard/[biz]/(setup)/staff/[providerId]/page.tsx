import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TimeOffManager } from "@/components/dashboard/time-off-manager";
import { PageHeader } from "@/components/ui/page";
import { SettingsSection, SettingsStack } from "@/components/ui/settings";
import { requireBusiness } from "@/lib/business/access";
import { getBusinessHours, listProviders, listServices, listTimeOff } from "@/lib/dashboard/queries";
import { dateInZone } from "@/lib/scheduling/time";
import { getSiteCopy } from "@/lib/site-locale";
import { ProfileForm, ProviderHoursForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.staffMember };
}

export default async function ProviderPage({ params }: PageProps<"/dashboard/[biz]/staff/[providerId]">) {
  const { biz, providerId } = await params;
  const [{ business }, { t }] = await Promise.all([requireBusiness(biz, "admin"), getSiteCopy()]);
  const st = t.dash.staff;
  const [providers, services, businessHours, timeOff] = await Promise.all([
    listProviders(business.id),
    listServices(business.id),
    getBusinessHours(business.id),
    listTimeOff(business.id, { providerId }),
  ]);
  const provider = providers.find((p) => p.id === providerId);
  if (!provider) notFound();

  return (
    <>
      <Link href={`/dashboard/${business.slug}/staff`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {st.title}
      </Link>
      <PageHeader title={provider.name} description={provider.title ?? undefined} />
      <SettingsStack>
        <SettingsSection title={st.profile}>
          <div className="p-5">
            <ProfileForm
              slug={business.slug}
              provider={{
                id: provider.id,
                name: provider.name,
                title: provider.title,
                bio: provider.bio,
                active: provider.active,
                serviceIds: provider.serviceIds,
              }}
              services={services.map((s) => ({ id: s.id, name: s.name, active: s.active }))}
            />
          </div>
        </SettingsSection>
        <SettingsSection title={st.workingHours} description={st.workingHoursBody}>
          <div className="p-5">
            <ProviderHoursForm
              slug={business.slug}
              providerId={provider.id}
              useBusinessHours={provider.useBusinessHours}
              schedule={provider.useBusinessHours ? businessHours : provider.schedule}
            />
          </div>
        </SettingsSection>
        <SettingsSection title={st.timeOff} description={st.timeOffBody(provider.name)}>
          <div className="p-5">
            <TimeOffManager
              slug={business.slug}
              timezone={business.timezone}
              entries={timeOff}
              providerId={provider.id}
              today={dateInZone(new Date(), business.timezone)}
              emptyLabel={st.noTimeOff}
            />
          </div>
        </SettingsSection>
      </SettingsStack>
    </>
  );
}
