import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page";
import { retryJobsAction, runJobsNowAction } from "@/lib/admin/actions";
import { jobsAdmin } from "@/lib/admin/queries";
import { fmtDate, fmtTime } from "@/lib/format";
import { getSiteCopy } from "@/lib/site-locale";
import { td, th } from "../search";
import { ActButton } from "../ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.admin.nav.jobs };
}

export default async function AdminJobs() {
  const [{ t, locale }, data] = await Promise.all([getSiteCopy(), jobsAdmin()]);
  const j = t.admin.jobs;
  const when = (d: Date) => `${fmtDate(d, "Asia/Yangon", { day: "numeric", month: "short" }, locale)} ${fmtTime(d, "Asia/Yangon", locale)}`;
  const table = (rows: typeof data.upcoming, retry: boolean) => (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="border-b">
          <tr>
            <th className={th}>{j.type}</th>
            <th className={th}>{j.runAt}</th>
            <th className={th}>{j.attempts}</th>
            <th className={th}>{j.lastError}</th>
            {retry ? <th className={th} /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className={`${td} font-mono text-xs`}>{r.type}</td>
              <td className={td}>{when(r.runAt)}</td>
              <td className={`${td} tabular-nums`}>{r.attempts}</td>
              <td className={`${td} max-w-md truncate text-xs text-muted-foreground`} title={r.lastError ?? undefined}>
                {r.lastError ?? "–"}
              </td>
              {retry ? (
                <td className={td}>
                  <ActButton action={retryJobsAction.bind(null, r.id)}>{j.retry}</ActButton>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length ? null : <p className="p-6 text-center text-sm text-muted-foreground">{t.admin.common.none}</p>}
    </div>
  );
  return (
    <>
      <PageHeader
        title={t.admin.nav.jobs}
        description={`${j.description} ${j.counts(data.pending, data.failed)}`}
        actions={
          <>
            <ActButton action={runJobsNowAction}>{j.runNow}</ActButton>
            {data.failed ? <ActButton action={retryJobsAction.bind(null, null)}>{j.retryAll}</ActButton> : null}
          </>
        }
      />
      <section className="grid gap-2">
        <h2 className="text-sm font-semibold">{t.admin.overview.jobsFailed}</h2>
        {table(data.failedJobs, true)}
      </section>
      <section className="grid gap-2">
        <h2 className="text-sm font-semibold">{t.admin.overview.jobsPending}</h2>
        {table(data.upcoming, false)}
      </section>
    </>
  );
}
