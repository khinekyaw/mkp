import type { ReactNode } from "react";

/** Stacked bar with a marker at each segment's end; the rest is hatched. */
export function ProgressBar({ segments }: { segments: { value: number; className: string; icon: ReactNode; label: string }[] }) {
  const marks = segments.map((s, i) => ({ ...s, at: segments.slice(0, i + 1).reduce((a, x) => a + x.value, 0) }));
  const shown = marks.filter((m) => m.value > 0 && m.at < 100);
  return (
    <div className="grid gap-1.5">
      <div className="relative pt-7">
        {shown.map((m) => (
            <span key={m.label} className="absolute top-0 bottom-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${m.at}%` }}>
              <span className="grid size-5 place-items-center rounded-full bg-background text-foreground ring-1 ring-border [&_svg]:size-3">{m.icon}</span>
              <span className="w-px flex-1 bg-foreground/70" />
            </span>
          ))}
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}%`).join(", ")}>
          {segments.map((s) => (s.value ? <div key={s.label} className={s.className} style={{ width: `${s.value}%` }} /> : null))}
          <div className="hatch flex-1" />
        </div>
      </div>
      <div className="relative h-4 text-[11px] text-muted-foreground tabular-nums">
        {/* A marker's label replaces the end label it would collide with. */}
        {shown.some((m) => m.at < 14) ? null : <span className="absolute left-0">0%</span>}
        {shown.map((m) => (
          <span key={m.label} className="absolute -translate-x-1/2" style={{ left: `${Math.min(95, Math.max(5, m.at))}%` }}>
            {m.at}%
          </span>
        ))}
        {shown.some((m) => m.at > 86) ? null : <span className="absolute right-0">100%</span>}
      </div>
    </div>
  );
}
