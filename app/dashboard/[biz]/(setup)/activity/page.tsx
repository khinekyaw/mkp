import { History } from "lucide-react";
import type { Metadata } from "next";
import { List } from "@/components/ui/list";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { listActivity } from "@/lib/dashboard/queries";
import type { BookingStatus } from "@/lib/db/schema";
import { fmtDate, fmtTime } from "@/lib/format";
import { getSiteCopy } from "@/lib/site-locale";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.activity };
}

const STATUSES = new Set<string>(["pending", "confirmed", "completed", "cancelled", "no_show"]);

/** The clinic's audit log: who changed appointments and the team, and when. */
export default async function ActivityPage({ params }: PageProps<"/dashboard/[biz]/activity">) {
  const { biz } = await params;
  const [{ business }, { t, locale }] = await Promise.all([requireBusiness(biz, "admin"), getSiteCopy()]);
  const ac = t.dash.activity;
  const tz = business.timezone;
  const events = await listActivity(business.id);
  const when = (d: Date | string) => `${fmtDate(d, tz, { month: "short", day: "numeric" }, locale)} ${fmtTime(d, tz, locale)}`;

  function details(data: Record<string, unknown> | null): string | null {
    if (!data) return null;
    const { from, to } = data as { from?: string; to?: string };
    if (from && to && STATUSES.has(from) && STATUSES.has(to)) {
      return `${t.dash.status[from as BookingStatus]} → ${t.dash.status[to as BookingStatus]}`;
    }
    if (from && to && !Number.isNaN(Date.parse(from))) return `${when(from)} → ${when(to)}`;
    if (typeof data.startsAt === "string") return when(data.startsAt);
    if (typeof data.email === "string") return data.email;
    if (typeof data.name === "string") return data.name;
    return null;
  }

  return (
    <>
      <PageHeader title={ac.title} description={ac.description} />
      {events.length ? (
        <List>
          {events.map((e) => {
            const who = e.actorName ?? (e.actorType === "user" ? "—" : ac.actors[e.actorType]);
            const extra = details(e.data);
            return (
              <li key={e.id} className="grid gap-0.5 rounded-[0.875rem] px-3 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <span className="text-xs text-muted-foreground tabular-nums">{when(e.createdAt)}</span>
                <span className="text-sm">
                  <span className="font-medium">{who}</span>
                  {e.actorType === "patient" && e.actorName ? <span className="text-muted-foreground"> ({ac.actors.patient})</span> : null}{" "}
                  {ac.actions[e.action] ?? e.action}
                  {extra ? <span className="block text-xs text-muted-foreground">{extra}</span> : null}
                </span>
              </li>
            );
          })}
        </List>
      ) : (
        <EmptyState icon={<History />} title={ac.empty} />
      )}
    </>
  );
}
