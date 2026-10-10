import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page";
import { overviewStats } from "@/lib/admin/queries";
import { getSiteCopy } from "@/lib/site-locale";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.admin.nav.overview };
}

function Stat({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const body = (
    <>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-medium tabular-nums">{value}</span>
    </>
  );
  const cls = "grid gap-1 rounded-lg border bg-background p-4";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-foreground/30`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default async function AdminOverview() {
  const [{ t }, s] = await Promise.all([getSiteCopy(), overviewStats()]);
  const o = t.admin.overview;
  const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "–");
  const steps = [
    { key: "created", n: s.funnel.created },
    { key: "configured", n: s.funnel.configured },
    { key: "shared", n: s.funnel.shared },
    { key: "booked", n: s.funnel.booked },
  ] as const;
  return (
    <>
      <PageHeader title={t.admin.nav.overview} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={o.clinics} value={s.clinics.total} href="/admin/businesses" />
        <Stat label={o.activeClinics} value={s.clinics.active7} />
        <Stat label={o.signups7} value={s.signups.d7} href="/admin/users" />
        <Stat label={o.signups30} value={s.signups.d30} />
        <Stat label={o.bookingsToday} value={s.bookings.today} />
        <Stat label={o.bookings7} value={s.bookings.d7} />
        <Stat label={o.online7} value={s.bookings.online7} />
        <Stat label={o.noShowRate} value={s.noShowRate === null ? "–" : `${Math.round(s.noShowRate * 100)}%`} />
        <Stat label={o.jobsPending} value={s.jobs.pending} href="/admin/jobs" />
        <Stat label={o.jobsFailed} value={s.jobs.failed} href="/admin/jobs" />
        <Stat label={o.aiToday} value={s.aiToday} />
        <Stat label={`${o.suspended} / ${o.deleted}`} value={`${s.clinics.suspended} / ${s.clinics.deleted}`} />
      </div>
      <section className="grid gap-3 rounded-lg border bg-background p-5">
        <h2 className="text-sm font-semibold">{o.funnel}</h2>
        <ol className="grid gap-2">
          {steps.map((step) => (
            <li key={step.key} className="grid grid-cols-[10rem_1fr_3.5rem] items-center gap-3 text-sm sm:grid-cols-[14rem_1fr_4rem]">
              <span>{o.funnelSteps[step.key]}</span>
              <span className="h-2 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary" style={{ width: pct(step.n, s.funnel.created) === "–" ? "0%" : pct(step.n, s.funnel.created) }} />
              </span>
              <span className="text-right tabular-nums text-muted-foreground">
                {step.n} · {pct(step.n, s.funnel.created)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
