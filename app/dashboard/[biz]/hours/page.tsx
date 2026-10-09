import type { Metadata } from "next";
import { TimeOffManager } from "@/components/dashboard/time-off-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { getBusinessHours, listTimeOff } from "@/lib/dashboard/queries";
import { dateInZone } from "@/lib/scheduling/time";
import { HoursForm } from "./hours-form";

export const metadata: Metadata = { title: "Hours & closures" };

export default async function HoursPage({ params }: PageProps<"/dashboard/[biz]/hours">) {
  const { biz } = await params;
  const { business } = await requireBusiness(biz, "admin");
  const [hours, closures] = await Promise.all([getBusinessHours(business.id), listTimeOff(business.id, { providerId: null })]);

  return (
    <>
      <PageHeader title="Hours & closures" description={`All times in ${business.timezone.replace(/_/g, " ")}.`} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Opening hours</CardTitle>
            <CardDescription>Staff who use business hours are bookable during these times. Add a second range for lunch breaks.</CardDescription>
          </CardHeader>
          <CardContent>
            <HoursForm slug={business.slug} initial={hours} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Closures</CardTitle>
            <CardDescription>Public holidays and other days the whole clinic is closed.</CardDescription>
          </CardHeader>
          <CardContent>
            <TimeOffManager
              slug={business.slug}
              timezone={business.timezone}
              entries={closures}
              today={dateInZone(new Date(), business.timezone)}
              emptyLabel="No upcoming closures."
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
