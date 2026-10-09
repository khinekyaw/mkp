import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TimeOffManager } from "@/components/dashboard/time-off-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { getBusinessHours, listProviders, listServices, listTimeOff } from "@/lib/dashboard/queries";
import { dateInZone } from "@/lib/scheduling/time";
import { ProfileForm, ProviderHoursForm } from "./forms";

export const metadata: Metadata = { title: "Staff member" };

export default async function ProviderPage({ params }: PageProps<"/dashboard/[biz]/staff/[providerId]">) {
  const { biz, providerId } = await params;
  const { business } = await requireBusiness(biz, "admin");
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
        <ArrowLeft className="size-4" /> Staff
      </Link>
      <PageHeader title={provider.name} description={provider.title ?? undefined} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile & services</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Working hours</CardTitle>
              <CardDescription>Use the clinic&apos;s opening hours, or set a personal schedule.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProviderHoursForm
                slug={business.slug}
                providerId={provider.id}
                useBusinessHours={provider.useBusinessHours}
                schedule={provider.useBusinessHours ? businessHours : provider.schedule}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Time off</CardTitle>
              <CardDescription>Patients can&apos;t book {provider.name} during these times.</CardDescription>
            </CardHeader>
            <CardContent>
              <TimeOffManager
                slug={business.slug}
                timezone={business.timezone}
                entries={timeOff}
                providerId={provider.id}
                today={dateInZone(new Date(), business.timezone)}
                emptyLabel="No upcoming time off."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
