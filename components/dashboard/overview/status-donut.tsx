import type { BookingStatus } from "@/lib/db/schema";
import type { DashCopy } from "@/lib/copy/dashboard";
import { cn } from "@/lib/utils";

const STROKE: Partial<Record<BookingStatus, string>> = {
  completed: "stroke-sage-deep",
  confirmed: "stroke-primary",
  pending: "stroke-tone-yellow",
  no_show: "stroke-tone-red",
};

const SWATCH: Partial<Record<BookingStatus, string>> = {
  completed: "bg-sage-deep",
  confirmed: "bg-primary",
  pending: "bg-tone-yellow",
  no_show: "bg-tone-red",
};

/** Today's appointments by status: a slim ring with a total, beside a legend. */
export function StatusDonut({ counts, cancelled, d }: { counts: { status: BookingStatus; n: number }[]; cancelled: number; d: DashCopy }) {
  const total = counts.reduce((a, c) => a + c.n, 0);
  const r = 54;
  const c = 2 * Math.PI * r;
  const parts = counts.filter((x) => x.n > 0);
  // Flat ends separated by a small gap (in SVG units) read cleaner than round caps.
  const gap = parts.length > 1 ? 3 : 0;
  const arcs = parts.map((p, i) => ({
    ...p,
    len: (p.n / total) * c,
    offset: (parts.slice(0, i).reduce((a, x) => a + x.n, 0) / total) * c,
  }));
  return (
    <div className="grid content-start gap-4 rounded-2xl bg-sage-soft/35 p-4">
      <p className="text-sm font-medium">{d.overview.byStatus}</p>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden>
            <circle cx="64" cy="64" r={r} fill="none" strokeWidth="10" className="stroke-background" />
            {arcs.map((a) => (
              <circle
                key={a.status}
                cx="64"
                cy="64"
                r={r}
                fill="none"
                strokeWidth="10"
                strokeDasharray={`${Math.max(0.5, a.len - gap)} ${c}`}
                strokeDashoffset={-a.offset - gap / 2}
                className={STROKE[a.status]}
              />
            ))}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="text-3xl leading-none font-medium tabular-nums">{total}</span>
            <span className="pt-1.5 text-[11px] leading-none text-muted-foreground">{d.overview.appointmentsN(total)}</span>
          </div>
        </div>
        <ul className="grid min-w-32 flex-1 gap-2 text-[13px]">
          {counts.map((x) => (
            <li key={x.status} className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-2", !x.n && "text-muted-foreground")}>
              <span aria-hidden className={cn("size-2 rounded-full", SWATCH[x.status], !x.n && "opacity-40")} />
              <span className="truncate">{d.status[x.status]}</span>
              <span className="font-medium tabular-nums">{x.n}</span>
            </li>
          ))}
          {cancelled ? (
            <li className="border-t border-foreground/10 pt-2 text-xs text-muted-foreground tabular-nums">{d.overview.cancelledN(cancelled)}</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
