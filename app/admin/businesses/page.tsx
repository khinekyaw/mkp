import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
import { listBusinessesAdmin } from "@/lib/admin/queries";
import { fmtDate } from "@/lib/format";
import { getSiteCopy } from "@/lib/site-locale";
import { SearchForm, td, th } from "../search";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.admin.nav.businesses };
}

const TZ = "Asia/Yangon";

export default async function AdminBusinesses({ searchParams }: PageProps<"/admin/businesses">) {
  const q = (await searchParams).q;
  const query = Array.isArray(q) ? q[0] : q;
  const [{ t, locale }, rows] = await Promise.all([getSiteCopy(), listBusinessesAdmin({ q: query })]);
  const a = t.admin;
  const date = (d: Date | null) => (d ? fmtDate(d, TZ, { day: "numeric", month: "short", year: "numeric" }, locale) : "–");
  return (
    <>
      <PageHeader title={a.nav.businesses} />
      <SearchForm q={query} placeholder={a.common.searchPlaceholder} label={a.common.search} />
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="border-b">
            <tr>
              <th className={th}>{a.nav.businesses}</th>
              <th className={th}>{a.businesses.owner}</th>
              <th className={th}>{a.common.status}</th>
              <th className={th}>{a.businesses.plan}</th>
              <th className={th}>{a.businesses.bookings30}</th>
              <th className={th}>{a.businesses.lastBooking}</th>
              <th className={th}>{a.common.created}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const state = b.deletedAt ? "deleted" : b.status;
              return (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className={td}>
                    <Link href={`/admin/businesses/${b.id}`} className="font-medium underline-offset-4 hover:underline">
                      {b.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">/b/{b.slug}</span>
                  </td>
                  <td className={td}>{b.owners.map((o) => o.email).join(", ") || "–"}</td>
                  <td className={td}>
                    <Badge variant={state === "active" ? "default" : "muted"}>{a.businesses.statusLabel[state]}</Badge>
                  </td>
                  <td className={td}>{b.plan}</td>
                  <td className={`${td} tabular-nums`}>{b.bookings30}</td>
                  <td className={td}>{date(b.lastBooking)}</td>
                  <td className={td}>{date(b.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length ? null : <p className="p-6 text-center text-sm text-muted-foreground">{a.common.none}</p>}
      </div>
    </>
  );
}
