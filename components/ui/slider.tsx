import type { CSSProperties, ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A native range input drawn in the kit's colors (`.slider` in globals.css):
 * a thin track filled in the primary color up to a round thumb. The fill
 * follows `value`, so use it controlled.
 */
export function Slider({ className, style, min = 0, max = 100, value, defaultValue, ...props }: Omit<ComponentProps<"input">, "type">) {
  const current = Number(value ?? defaultValue ?? min);
  const fill = ((current - Number(min)) / (Number(max) - Number(min) || 1)) * 100;
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      defaultValue={defaultValue}
      style={{ "--fill": `${fill}%`, ...style } as CSSProperties}
      className={cn("slider h-10 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50", className)}
      {...props}
    />
  );
}
