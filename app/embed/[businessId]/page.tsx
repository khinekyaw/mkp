import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicBusiness } from "@/lib/business/public";
import { toLocale } from "@/lib/i18n";
import { EmbeddedWidget } from "./embedded-widget";

export const metadata: Metadata = { title: "Book an appointment", robots: { index: false } };

export default async function EmbedPage({ params, searchParams }: PageProps<"/embed/[businessId]">) {
  const [{ businessId }, query] = await Promise.all([params, searchParams]);
  const business = await getPublicBusiness({ id: businessId });
  if (!business) notFound();
  const lang = Array.isArray(query.lang) ? query.lang[0] : query.lang;

  return (
    <>
      {/* Let the host page show through around the widget's rounded corners. */}
      <style>{`html,body{background:transparent!important;min-height:0!important}`}</style>
      <EmbeddedWidget business={business} locale={toLocale(lang, business.locales[0])} />
    </>
  );
}
