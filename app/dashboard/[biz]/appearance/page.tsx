import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Studio } from "@/components/studio/studio";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { getPublicBusiness } from "@/lib/business/public";
import { saveThemeAction } from "@/lib/dashboard/actions/business";

export const metadata: Metadata = { title: "Appearance" };

export default async function AppearancePage({ params, searchParams }: PageProps<"/dashboard/[biz]/appearance">) {
  const [{ biz }, query] = await Promise.all([params, searchParams]);
  const { business } = await requireBusiness(biz, "admin");
  const publicBusiness = await getPublicBusiness({ id: business.id });
  if (!publicBusiness) notFound();

  return (
    <>
      <PageHeader
        title="Appearance"
        description="Paste your website and we'll match the booking widget and page to your brand."
      />
      <Studio
        business={publicBusiness}
        mode="preview"
        initialTheme={publicBusiness.theme}
        initialUrl={business.website ?? undefined}
        autoDetect={query.detect === "1" && !!business.website}
        saveTheme={saveThemeAction.bind(null, business.slug)}
      />
    </>
  );
}
