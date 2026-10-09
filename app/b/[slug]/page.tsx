import { MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { LiveWidget } from "@/components/booking/live-widget";
import { ThemeScope } from "@/components/booking/theme-scope";
import { getPublicBusiness } from "@/lib/business/public";
import { toLocale } from "@/lib/i18n";

const load = cache((slug: string) => getPublicBusiness({ slug }));

export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  const business = await load((await params).slug);
  if (!business) return { title: "Not found" };
  return {
    title: { absolute: `Book an appointment · ${business.name}` },
    description: `Book online with ${business.name}${business.address ? `, ${business.address}` : ""}.`,
    openGraph: { title: `Book with ${business.name}` },
  };
}

/** Hosted booking page: shareable on Facebook/Viber for businesses without a website. */
export default async function BookingPage({ params, searchParams }: PageProps<"/b/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const business = await load(slug);
  if (!business) notFound();
  const lang = Array.isArray(query.lang) ? query.lang[0] : query.lang;
  const tel = business.phone?.replace(/[^\d+]/g, "");

  return (
    <ThemeScope theme={business.theme} className="min-h-dvh">
      <div className="mx-auto grid max-w-xl gap-6 px-4 py-8 sm:py-14">
        <header className="grid gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{business.name}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
            {business.address ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden /> {business.address}
              </span>
            ) : null}
            {business.phone ? (
              <a href={`tel:${tel}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Phone className="size-4" aria-hidden /> {business.phone}
              </a>
            ) : null}
          </div>
        </header>
        <LiveWidget business={business} locale={toLocale(lang, business.locales[0])} source="page" className="shadow-sm" />
      </div>
    </ThemeScope>
  );
}
