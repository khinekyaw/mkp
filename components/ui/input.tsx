import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full min-w-0 rounded-md border bg-background px-3 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/15 disabled:opacity-50 aria-invalid:border-red-500";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldBase, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-20 resize-y py-2", className)} {...props} />;
}
