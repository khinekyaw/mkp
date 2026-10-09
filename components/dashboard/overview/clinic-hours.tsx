import type { DashCopy } from "@/lib/copy/dashboard";
import type { Locale } from "@/lib/i18n";
import { fmtClock } from "@/lib/format";

export function ClinicHours({
  opensAt,
  closesAt,
  now,
  intervals,
  o,
  locale,
}: {
  opensAt: number | null;
  closesAt: number | null;
  now: number;
  intervals: string | null;
  o: DashCopy["overview"];
  locale: Locale;
}) {
  if (opensAt === null || closesAt === null) {
    return <p className="text-sm text-muted-foreground">{o.closedToday}</p>;
  }
  const progress = Math.round(Math.min(1, Math.max(0, (now - opensAt) / (closesAt - opensAt))) * 100);
  const left = closesAt - now;
  const status = now < opensAt ? o.opensAt(fmtClock(opensAt, locale)) : now >= closesAt ? o.closedForDay : o.remaining(Math.floor(left / 60), left % 60);
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="font-medium">{now >= opensAt && now < closesAt ? o.openNow : o.today}</span>
        <span className="text-muted-foreground tabular-nums">{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[11px] text-muted-foreground tabular-nums">
        <span>{intervals}</span>
        <span>{status}</span>
      </div>
    </div>
  );
}
