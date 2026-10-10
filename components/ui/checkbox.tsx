import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A native checkbox drawn in the kit's colors, so it still posts with forms
 * (`name`, `value`, `defaultChecked`) and works controlled. `className` sizes
 * and places the box.
 */
export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <span className={cn("inline-grid size-[18px] shrink-0 place-items-center", className)}>
      <input
        type="checkbox"
        className="peer col-start-1 row-start-1 size-full cursor-pointer appearance-none rounded-[0.3rem] border border-foreground/25 bg-background transition-colors outline-none hover:border-foreground/40 checked:border-primary checked:bg-primary focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
      <Check
        aria-hidden
        strokeWidth={3}
        className="pointer-events-none col-start-1 row-start-1 size-3 text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100"
      />
    </span>
  );
}
