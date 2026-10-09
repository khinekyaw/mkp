import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-[1.25rem] bg-background p-5", className)}>{children}</section>;
}

export function RoundLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} title={label} className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
      <ArrowUpRight className="size-4" />
    </Link>
  );
}

export function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span aria-hidden className={cn("size-2.5 rounded-full", swatch)} />
      {label}
    </span>
  );
}
