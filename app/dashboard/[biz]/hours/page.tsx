import type { Metadata } from "next";
import { TimeOffManager } from "@/components/dashboard/time-off-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
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
    <>
      <PageHeader title={h.title} description={h.allTimesIn(business.timezone.replace(/_/g, " "))} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>{h.opening}</CardTitle>
            <CardDescription>{h.openingBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <HoursForm slug={business.slug} initial={hours} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{h.closures}</CardTitle>
            <CardDescription>{h.closuresBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <TimeOffManager
              slug={business.slug}
              timezone={business.timezone}
              entries={closures}
              today={dateInZone(new Date(), business.timezone)}
              emptyLabel={h.noClosures}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
