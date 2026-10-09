import { Download } from "lucide-react";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { CopyLink } from "@/components/dashboard/copy-link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { appUrl } from "@/lib/url";
import { EmbedCodes } from "./embed-codes";

export const metadata: Metadata = { title: "Share & embed" };

export default async function SharePage({ params }: PageProps<"/dashboard/[biz]/share">) {
  const { biz } = await params;
  const { business } = await requireBusiness(biz, "admin");
  const bookingUrl = appUrl(`/b/${business.slug}`);
  const qrSvg = await QRCode.toString(bookingUrl, { type: "svg", margin: 1, color: { dark: "#0a0a0a", light: "#ffffff" } });
  const qrPng = await QRCode.toDataURL(bookingUrl, { width: 1024, margin: 2 });

  return (
    <>
      <PageHeader title="Share & embed" description="Let patients book from your website, Facebook page, Viber or a printed QR code." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking page</CardTitle>
              <CardDescription>
                A hosted page in your brand. Put it in your Facebook page&apos;s &ldquo;Book now&rdquo; button, Viber, or Instagram bio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CopyLink value={bookingUrl} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Add to your website</CardTitle>
              <CardDescription>Paste one tag into any page. Works with WordPress, Wix, Squarespace and plain HTML.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmbedCodes businessId={business.id} origin={appUrl("").replace(/\/$/, "")} locales={business.settings.locales} />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>QR code</CardTitle>
            <CardDescription>Print it for your reception desk or flyers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-md border bg-white p-3 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <a href={qrPng} download={`${business.slug}-booking-qr.png`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Download /> Download PNG
            </a>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
