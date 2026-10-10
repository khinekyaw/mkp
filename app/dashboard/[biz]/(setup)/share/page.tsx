import { Download } from "lucide-react";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { CopyLink } from "@/components/dashboard/copy-link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { getSiteCopy } from "@/lib/site-locale";
import { appUrl } from "@/lib/url";
import { EmbedCodes } from "./embed-codes";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.share };
}

export default async function SharePage({ params }: PageProps<"/dashboard/[biz]/share">) {
  const { biz } = await params;
  const [{ business }, { t }] = await Promise.all([requireBusiness(biz, "admin"), getSiteCopy()]);
  const sh = t.dash.share;
  const bookingUrl = appUrl(`/b/${business.slug}`);
  const qrSvg = await QRCode.toString(bookingUrl, { type: "svg", margin: 1, color: { dark: "#0a0a0a", light: "#ffffff" } });
  const qrPng = await QRCode.toDataURL(bookingUrl, { width: 1024, margin: 2 });

  return (
    <>
      <PageHeader title={sh.title} description={sh.description} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{sh.bookingPage}</CardTitle>
              <CardDescription>{sh.bookingPageBody}</CardDescription>
            </CardHeader>
            <CardContent>
              <CopyLink value={bookingUrl} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{sh.facebook}</CardTitle>
              <CardDescription>{sh.facebookBody}</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="grid list-decimal gap-1.5 pl-5 text-sm">
                {sh.facebookSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{sh.website}</CardTitle>
              <CardDescription>{sh.websiteBody}</CardDescription>
            </CardHeader>
            <CardContent>
              <EmbedCodes businessId={business.id} origin={appUrl("").replace(/\/$/, "")} locales={business.settings.locales} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{sh.qr}</CardTitle>
            <CardDescription>{sh.qrBody}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-md border bg-white p-3 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <a href={qrPng} download={`${business.slug}-booking-qr.png`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Download /> {sh.download}
            </a>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
