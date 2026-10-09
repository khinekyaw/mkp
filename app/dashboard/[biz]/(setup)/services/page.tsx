import type { Metadata } from "next";
import { requireBusiness } from "@/lib/business/access";
import { listProviders, listServices } from "@/lib/dashboard/queries";
import { getSiteCopy } from "@/lib/site-locale";
import { ServicesManager } from "./services-manager";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.services };
}

export default async function ServicesPage({ params }: PageProps<"/dashboard/[biz]/services">) {
  const { biz } = await params;
  const { business } = await requireBusiness(biz, "admin");
  const [services, providers] = await Promise.all([listServices(business.id), listProviders(business.id)]);
  return (
    <ServicesManager
      slug={business.slug}
      services={services}
      providers={providers.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}
