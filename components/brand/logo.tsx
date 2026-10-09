import { Cross } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Wordmark with its round sage mark. `compact` drops the wordmark on phones. */
export function Logo({ href = "/", compact = false, className }: { href?: string; compact?: boolean; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="Booking Widget"
      className={cn("flex shrink-0 items-center gap-2.5 text-[15px] font-semibold tracking-tight whitespace-nowrap text-foreground", className)}
    >
      <span aria-hidden className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
        <Cross className="size-5 fill-current" strokeWidth={1.5} />
      </span>
      <span className={cn(compact && "hidden sm:inline")}>Booking Widget</span>
    </Link>
  );
}
