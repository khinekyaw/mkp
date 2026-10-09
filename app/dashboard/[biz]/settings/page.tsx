import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { appUrl } from "@/lib/url";
import { ProfileSettings, RulesSettings } from "./forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params }: PageProps<"/dashboard/[biz]/settings">) {
  const { biz } = await params;
  const { business } = await requireBusiness(biz, "admin");
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Business details</CardTitle>
            <CardDescription>Shown on your booking page and in confirmation emails.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileSettings
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
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Booking rules</CardTitle>
            <CardDescription>Control when and how patients can book online.</CardDescription>
          </CardHeader>
          <CardContent>
            <RulesSettings slug={business.slug} settings={business.settings} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
