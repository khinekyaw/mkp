import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
import { billingRows } from "@/lib/admin/queries";
import { fmtDate } from "@/lib/format";
import { getSiteCopy } from "@/lib/site-locale";
import { td, th } from "../search";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.admin.nav.billing };
}

type BillingState = "trial" | "trialEnded" | "paid" | "overdue" | "free";

/** Where a clinic stands: on a trial, free, paid up, or behind. */
function billingState(row: { plan: string; trialEndsAt: Date | null; paidUntil: Date | null }, now = Date.now()): BillingState {
  if (row.plan === "free") return "free";
  if (row.paidUntil && row.paidUntil.getTime() >= now) return "paid";
  if (row.plan === "trial") return row.trialEndsAt && row.trialEndsAt.getTime() < now ? "trialEnded" : "trial";
  return "overdue";
}

const ORDER: BillingState[] = ["overdue", "trialEnded", "trial", "paid", "free"];

export default async function AdminBilling() {
  const [{ t, locale }, rows] = await Promise.all([getSiteCopy(), billingRows()]);
  const a = t.admin;
  const day = (d: Date) => fmtDate(d, "Asia/Yangon", { day: "numeric", month: "short", year: "numeric" }, locale);
  const withState = rows
    .map((r) => ({ ...r, paidUntil: r.paidUntil ? new Date(r.paidUntil) : null }))
    .map((r) => ({ ...r, state: billingState(r) }))
    .sort((x, y) => ORDER.indexOf(x.state) - ORDER.indexOf(y.state));
  return (
    <>
      <PageHeader title={a.nav.billing} description={a.billing.description} />
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b">
            <tr>
              <th className={th}>{a.nav.businesses}</th>
              <th className={th}>{a.businesses.plan}</th>
              <th className={th}>{a.common.status}</th>
              <th className={th}>{a.businesses.owner}</th>
            </tr>
          </thead>
          <tbody>
            {withState.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className={td}>
                  <Link href={`/admin/businesses/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className={td}>{r.plan}</td>
                <td className={td}>
                  <Badge variant={r.state === "overdue" || r.state === "trialEnded" ? "default" : "outline"}>{a.billing.state[r.state]}</Badge>{" "}
                  <span className="text-xs text-muted-foreground">
                    {r.state === "paid" && r.paidUntil
                      ? a.billing.until(day(r.paidUntil))
                      : r.state === "trial" && r.trialEndsAt
                        ? a.billing.until(day(r.trialEndsAt))
                        : null}
                  </span>
                </td>
                <td className={td}>{r.owners.map((o) => o.email).join(", ") || "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
