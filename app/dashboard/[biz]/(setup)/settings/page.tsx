import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { getSiteCopy } from "@/lib/site-locale";
import { appUrl } from "@/lib/url";
import { ProfileSettings, RulesSettings } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.settings };
}

export default async function SettingsPage({ params }: PageProps<"/dashboard/[biz]/settings">) {
  const { biz } = await params;
  const [{ business }, { t }] = await Promise.all([requireBusiness(biz, "admin"), getSiteCopy()]);
  const se = t.dash.settings;
  return (
    <>
      <PageHeader title={se.title} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{se.details}</CardTitle>
            <CardDescription>{se.detailsBody}</CardDescription>
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
            <CardTitle>{se.rules}</CardTitle>
            <CardDescription>{se.rulesBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <RulesSettings slug={business.slug} settings={business.settings} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
