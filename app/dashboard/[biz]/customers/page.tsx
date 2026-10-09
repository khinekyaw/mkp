import { ChevronRight, Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/dashboard/avatar";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { listCustomers } from "@/lib/dashboard/queries";
import { fmtDate } from "@/lib/format";
import { getSiteCopy } from "@/lib/site-locale";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.customers };
}

/** Stored phones are normalized (959…); show them the way Myanmar users write them. */
function displayPhone(p: string) {
  return /^959\d{7,9}$/.test(p) ? `0${p.slice(2)}` : `+${p}`;
}

export default async function CustomersPage({ params, searchParams }: PageProps<"/dashboard/[biz]/customers">) {
  const [{ biz }, query] = await Promise.all([params, searchParams]);
  const [{ business }, { locale, t }] = await Promise.all([requireBusiness(biz), getSiteCopy()]);
  const c = t.dash.customers;
  const q = (Array.isArray(query.q) ? query.q[0] : query.q)?.slice(0, 80) ?? "";
  const customers = await listCustomers(business.id, { q });

  return (
    <>
      <PageHeader title={c.title} description={c.description} />
      <form className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder={c.search} className="rounded-full border-transparent pl-9" />
      </form>
      {customers.length ? (
        <ul className="divide-y overflow-hidden rounded-lg bg-background px-1.5">
          {customers.map((x) => (
            <li key={x.id}>
              <Link href={`/dashboard/${business.slug}/customers/${x.id}`} className="flex items-center gap-3 rounded-md px-3 py-3 hover:bg-muted/60">
                <Avatar name={x.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{x.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {displayPhone(x.phone)}
                    {x.email ? ` · ${x.email}` : ""}
                  </span>
                </span>
                <span className="text-right text-xs text-muted-foreground">
                  <span className="block">{c.visits(Number(x.visits))}</span>
                  {x.lastVisit ? <span className="block">{c.last(fmtDate(x.lastVisit, business.timezone, { month: "short", day: "numeric", year: "numeric" }, locale))}</span> : null}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Users />} title={q ? c.noMatches : c.noneYet} description={q ? c.tryAnother : c.addedAuto} />
      )}
    </>
  );
}
