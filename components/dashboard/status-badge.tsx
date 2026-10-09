import type { BookingStatus } from "@/lib/db/schema";
import { STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

// One status vocabulary across badges and calendar blocks (soft fill + ink):
// pending = amber, confirmed = green, completed = sage, cancelled = struck
// grey, no-show = red.
export const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: "bg-tone-amber-soft text-tone-amber",
  confirmed: "bg-tone-green-soft text-tone-green",
  completed: "bg-muted text-sage-deep",
  cancelled: "bg-muted text-muted-foreground line-through",
  no_show: "bg-tone-red-soft text-tone-red",
};

/** Dot color for each status (legend swatches, list markers). */
export const STATUS_DOT: Record<BookingStatus, string> = {
  pending: "bg-tone-yellow",
  confirmed: "bg-tone-green",
  completed: "bg-sage-deep",
  cancelled: "bg-muted-foreground/50",
  no_show: "bg-tone-red",
};

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        STATUS_STYLE[status],
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}
