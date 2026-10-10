import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page";
import { adminAudit } from "@/lib/admin/queries";
import { fmtDate, fmtTime } from "@/lib/format";
import { getSiteCopy } from "@/lib/site-locale";
import { td, th } from "../search";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.admin.nav.audit };
}

export default async function AdminAudit() {
  const [{ t, locale }, rows] = await Promise.all([getSiteCopy(), adminAudit()]);
  const when = (d: Date) => `${fmtDate(d, "Asia/Yangon", { day: "numeric", month: "short", year: "numeric" }, locale)} ${fmtTime(d, "Asia/Yangon", locale)}`;
  return (
    <>
      <PageHeader title={t.admin.nav.audit} description={t.admin.audit.description} />
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="border-b">
            <tr>
              <th className={th}>{t.admin.common.created}</th>
              <th className={th}>{t.dash.common.name}</th>
              <th className={th}>{t.admin.common.actions}</th>
              <th className={th}>{t.admin.nav.businesses}</th>
              <th className={th}>{t.admin.common.reason}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ event: e, businessName, businessId }) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className={`${td} whitespace-nowrap text-xs text-muted-foreground tabular-nums`}>{when(e.createdAt)}</td>
                <td className={td}>{e.actorName}</td>
                <td className={`${td} font-mono text-xs`}>{e.action}</td>
                <td className={td}>
                  {businessId ? (
                    <Link href={`/admin/businesses/${businessId}`} className="underline-offset-4 hover:underline">
                      {businessName}
                    </Link>
                  ) : null}
                </td>
                <td className={`${td} text-xs text-muted-foreground`}>{typeof e.data?.reason === "string" ? e.data.reason : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length ? null : <p className="p-6 text-center text-sm text-muted-foreground">{t.admin.common.none}</p>}
      </div>
    </>
  );
}
