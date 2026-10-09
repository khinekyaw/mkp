import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tile({
  icon,
  label,
  value,
  ratio,
  tone,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  ratio?: number;
  tone?: "amber";
  href: string;
}) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <Link href={href} className="grid content-start justify-items-center gap-2 rounded-2xl bg-muted px-3 py-4 text-center transition-colors hover:bg-border">
      <span className="relative grid size-12 place-items-center">
        <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="24" cy="24" r={r} fill="none" strokeWidth="2" className={tone === "amber" ? "stroke-tone-amber" : "stroke-border"} />
          {ratio !== undefined && ratio > 0 ? (
            <circle cx="24" cy="24" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${c * Math.min(1, ratio)} ${c}`} className="stroke-primary" />
          ) : null}
        </svg>
        <span className={cn("[&_svg]:size-[18px]", tone === "amber" ? "text-tone-amber" : "text-foreground")}>{icon}</span>
      </span>
      <span className="text-xs leading-snug font-medium">{label}</span>
      <span className="text-lg leading-none font-medium tabular-nums">{value}</span>
    </Link>
  );
}

export function FlowTile({ icon, label, value, note }: { icon: ReactNode; label: string; value: number; note: string }) {
  return (
    <div className="grid gap-3 rounded-2xl bg-muted p-3.5">
      <span className="grid size-8 place-items-center rounded-full bg-background ring-1 ring-border [&_svg]:size-4">{icon}</span>
      <div className="grid gap-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl leading-tight font-medium tabular-nums">{value}</p>
        <p className="text-[11px] text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}
