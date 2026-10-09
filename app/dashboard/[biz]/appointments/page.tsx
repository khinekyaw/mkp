import { ListChecks, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookingList } from "@/components/dashboard/booking-list";
import { NewBookingDialog } from "@/components/dashboard/new-booking-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { listAppointments, listProviders, listServices, type AppointmentFilter } from "@/lib/dashboard/queries";
import { dateInZone } from "@/lib/scheduling/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Appointments" };

const FILTERS: { value: AppointmentFilter; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "pending", label: "Pending" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
];
const PAGE = 50;

export default async function AppointmentsPage({ params, searchParams }: PageProps<"/dashboard/[biz]/appointments">) {
  const [{ biz }, query] = await Promise.all([params, searchParams]);
  const { business } = await requireBusiness(biz);
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const filter = (FILTERS.find((f) => f.value === one(query.filter))?.value ?? "upcoming") as AppointmentFilter;
  const q = one(query.q)?.slice(0, 80) ?? "";
  const limit = Math.min(500, Math.max(PAGE, Number(one(query.limit)) || PAGE));

  const [rows, services, providers] = await Promise.all([
    listAppointments(business.id, { filter, q, limit: limit + 1 }),
    listServices(business.id),
    listProviders(business.id),
  ]);
  const hasMore = rows.length > limit;
  const href = (p: Record<string, string | number>) => {
    const s = new URLSearchParams({ filter, ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) });
    return `?${s}`;
  };

  return (
    <>
      <PageHeader
        title="Appointments"
        actions={
          <NewBookingDialog
            slug={business.slug}
            timezone={business.timezone}
            services={services.filter((s) => s.active && s.providerIds.length)}
            providers={providers.filter((p) => p.active)}
            defaultDate={dateInZone(new Date(), business.timezone)}
          />
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="inline-flex rounded-full bg-background p-1" aria-label="Filter">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`?${new URLSearchParams({ filter: f.value, ...(q ? { q } : {}) })}`}
              aria-current={f.value === filter ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground",
                f.value === filter && "bg-primary font-medium text-primary-foreground hover:text-primary-foreground",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <form className="relative w-full sm:w-64">
          <input type="hidden" name="filter" value={filter} />
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search name or phone" className="rounded-full border-transparent pl-9" />
        </form>
      </div>
      {rows.length ? (
        <div className="overflow-hidden rounded-lg bg-background p-1.5">
          <BookingList bookings={rows.slice(0, limit)} slug={business.slug} timezone={business.timezone} />
        </div>
      ) : (
        <EmptyState
          icon={<ListChecks />}
          title={q ? "No matching appointments" : "Nothing here yet"}
          description={q ? "Try a different name or phone number." : "Appointments will appear here as patients book."}
        />
      )}
      {hasMore ? (
        <Link href={href({ limit: limit + PAGE })} scroll={false} className={cn(buttonVariants({ variant: "outline" }), "justify-self-center")}>
          Load more
        </Link>
      ) : null}
    </>
  );
}
