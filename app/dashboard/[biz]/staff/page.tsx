import { ChevronRight, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/dashboard/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { listProviders, listServices } from "@/lib/dashboard/queries";
import { AddStaffDialog } from "./add-staff-dialog";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage({ params }: PageProps<"/dashboard/[biz]/staff">) {
  const { biz } = await params;
  const { business } = await requireBusiness(biz, "admin");
  const [providers, services] = await Promise.all([listProviders(business.id), listServices(business.id)]);
  const serviceName = (id: string) => services.find((s) => s.id === id)?.name;

  return (
    <>
      <PageHeader
        title="Staff"
        description="Doctors and staff patients can book, with their own services and hours."
        actions={<AddStaffDialog slug={business.slug} services={services.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))} />}
      />
      {providers.length ? (
        <ul className="divide-y overflow-hidden rounded-lg bg-background px-1.5">
          {providers.map((p) => (
            <li key={p.id}>
              <Link href={`/dashboard/${business.slug}/staff/${p.id}`} className="flex items-center gap-3 rounded-md px-3 py-3 hover:bg-muted/60">
                <Avatar name={p.name} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    {!p.active ? <Badge variant="muted">Inactive</Badge> : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[p.title, p.serviceIds.map(serviceName).filter(Boolean).join(", ") || "No services"].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="hidden text-xs text-muted-foreground sm:block">{p.useBusinessHours ? "Business hours" : "Custom hours"}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<UserRound />} title="No staff yet" description="Add the doctors or staff patients can book with." />
      )}
    </>
  );
}
