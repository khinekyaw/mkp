"use client";

import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: React.ReactNode };

/** Compact single-select toggle group (tabs-like). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-full bg-muted p-1", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-7 cursor-pointer rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
            o.value === value && "bg-primary text-primary-foreground hover:text-primary-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
