import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A card of clickable rows. No divider lines: rows are separated by a small gap
 * and highlight as a rounded pill inset from the card edge, so the hover shape
 * never collides with rules or corners.
 */
export function List({ className, ...props }: ComponentProps<"ul">) {
  return <ul className={cn("grid gap-0.5 rounded-lg bg-background p-1.5", className)} {...props} />;
}

/** Class for the link/button filling a List row. */
export const listRow =
  "flex w-full cursor-pointer items-center gap-3 rounded-[0.875rem] px-3 py-3 text-left outline-none transition-colors duration-150 hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-primary/30";
