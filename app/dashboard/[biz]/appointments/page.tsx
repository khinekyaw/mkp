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
import { getSiteCopy } from "@/lib/site-locale";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.appointments };
}

const FILTERS = ["upcoming", "pending", "past", "cancelled"] as const satisfies readonly AppointmentFilter[];
const PAGE = 50;

export default async function AppointmentsPage({ params, searchParams }: PageProps<"/dashboard/[biz]/appointments">) {
  const [{ biz }, query] = await Promise.all([params, searchParams]);
  const [{ business }, { t }] = await Promise.all([requireBusiness(biz), getSiteCopy()]);
  const a = t.dash.appointments;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const filter: AppointmentFilter = FILTERS.find((f) => f === one(query.filter)) ?? "upcoming";
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
        title={a.title}
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
        <nav className="inline-flex rounded-full bg-background p-1" aria-label={a.filter}>
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={`?${new URLSearchParams({ filter: f, ...(q ? { q } : {}) })}`}
              aria-current={f === filter ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground",
                f === filter && "bg-primary text-primary-foreground hover:text-primary-foreground",
              )}
            >
              {a.filters[f]}
            </Link>
          ))}
        </nav>
        <form className="relative w-full sm:w-64">
          <input type="hidden" name="filter" value={filter} />
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder={a.search} className="rounded-full border-transparent pl-9" />
        </form>
      </div>
      {rows.length ? (
        <BookingList bookings={rows.slice(0, limit)} slug={business.slug} timezone={business.timezone} />
      ) : (
        <EmptyState
          icon={<ListChecks />}
          title={q ? a.noMatches : a.nothingYet}
          description={q ? a.tryDifferent : a.willAppear}
        />
      )}
      {hasMore ? (
        <Link href={href({ limit: limit + PAGE })} scroll={false} className={cn(buttonVariants({ variant: "outline" }), "justify-self-center")}>
          {a.loadMore}
        </Link>
      ) : null}
    </>
  );
}
