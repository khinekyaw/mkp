import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { listProviders, listServices } from "@/lib/dashboard/queries";
import { ServicesManager } from "./services-manager";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage({ params }: PageProps<"/dashboard/[biz]/services">) {
  const { biz } = await params;
  const { business } = await requireBusiness(biz, "admin");
  const [services, providers] = await Promise.all([listServices(business.id), listProviders(business.id)]);
  return (
    <>
      <PageHeader title="Services" description="What patients can book, how long it takes, and who provides it." />
      <ServicesManager
        slug={business.slug}
        services={services}
        providers={providers.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name }))}
      />
    </>
  );
}
