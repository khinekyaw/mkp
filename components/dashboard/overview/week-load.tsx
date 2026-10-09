import Link from "next/link";
import type { DashCopy } from "@/lib/copy/dashboard";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { fmtLocalDate } from "@/lib/format";
import { Legend } from "./primitives";

export function WeekLoad({ days, total, href, d, locale }: { days: { date: string; n: number }[]; total: number; href: string; d: DashCopy; locale: Locale }) {
  const peak = Math.max(1, ...days.map((x) => x.n));
  return (
    <Link href={href} className="grid gap-3 rounded-[1.25rem] bg-background p-5 transition-colors hover:bg-background/80">
      <div className="flex items-start justify-between gap-3">
        <p className="text-5xl leading-none font-medium tracking-tight tabular-nums">{total}</p>
        <div className="grid gap-1 text-[11px] text-muted-foreground">
          <Legend swatch="bg-primary" label={d.overview.legendToday} />
          <Legend swatch="bg-sage-soft" label={d.overview.legendComing} />
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="max-w-[10rem] text-sm leading-snug font-medium">{d.overview.week}</p>
        <div className="flex h-14 items-end gap-1" role="img" aria-label={days.map((x) => `${fmtLocalDate(x.date, { weekday: "short" }, locale)} ${x.n}`).join(", ")}>
          {days.map((day, i) => (
            <span key={day.date} className="grid justify-items-center gap-1">
              <span
                className={cn("w-2.5 rounded-full", i === 0 ? "bg-primary" : "bg-sage-soft")}
                style={{ height: `${Math.max(4, (day.n / peak) * 40)}px` }}
              />
              <span className="text-[9px] leading-none text-muted-foreground">{d.weekdaysNarrow[new Date(`${day.date}T00:00:00Z`).getUTCDay()]}</span>
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
