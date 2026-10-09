import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Native select styled like Input: accessible and mobile-friendly by default. */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-10 w-full min-w-0 cursor-pointer appearance-none rounded-md border bg-background pr-9 pl-3 text-sm text-foreground outline-none focus-visible:border-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/15 disabled:opacity-50"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
