import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Studio } from "@/components/studio/studio";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { getPublicBusiness } from "@/lib/business/public";
import { saveThemeAction } from "@/lib/dashboard/actions/business";
import { getSiteCopy } from "@/lib/site-locale";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.appearance };
}

export default async function AppearancePage({ params, searchParams }: PageProps<"/dashboard/[biz]/appearance">) {
  const [{ biz }, query] = await Promise.all([params, searchParams]);
  const [{ business }, { t }] = await Promise.all([requireBusiness(biz, "admin"), getSiteCopy()]);
  const publicBusiness = await getPublicBusiness({ id: business.id }, { includeSuspended: true });
  if (!publicBusiness) notFound();

  return (
    <>
      <PageHeader
        title={t.dash.appearance.title}
        description={t.dash.appearance.description}
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
