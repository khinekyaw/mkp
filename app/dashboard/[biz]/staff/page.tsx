import { ChevronRight, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/dashboard/avatar";
import { Badge } from "@/components/ui/badge";
import { List, listRow } from "@/components/ui/list";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { listProviders, listServices } from "@/lib/dashboard/queries";
import { getSiteCopy } from "@/lib/site-locale";
import { AddStaffDialog } from "./add-staff-dialog";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.staff };
}

export default async function StaffPage({ params }: PageProps<"/dashboard/[biz]/staff">) {
  const { biz } = await params;
  const [{ business }, { t }] = await Promise.all([requireBusiness(biz, "admin"), getSiteCopy()]);
  const st = t.dash.staff;
  const [providers, services] = await Promise.all([listProviders(business.id), listServices(business.id)]);
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name;

  return (
    <>
      <PageHeader
        title={st.title}
        description={st.description}
        actions={<AddStaffDialog slug={business.slug} services={services.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))} />}
      />
      {providers.length ? (
        <List>
          {providers.map((p) => (
            <li key={p.id}>
              <Link href={`/dashboard/${business.slug}/staff/${p.id}`} className={listRow}>
                <Avatar name={p.name} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    {!p.active ? <Badge variant="muted">{st.inactive}</Badge> : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[p.title, p.serviceIds.map(serviceName).filter(Boolean).join(", ") || st.noServicesAssigned].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="hidden text-xs text-muted-foreground sm:block">{p.useBusinessHours ? st.businessHours : st.customHours}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </List>
      ) : (
        <EmptyState icon={<UserRound />} title={st.emptyTitle} description={st.emptyBody} />
      )}
    </>
  );
}
