import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Primary pill action on the canvas. */
export const pillCta = (size: "md" | "lg" = "lg") => cn(buttonVariants({ size }), "rounded-full px-5");

/** Secondary pill action: white on the canvas. */
export const pillSecondary = (size: "md" | "lg" = "lg") =>
  cn(buttonVariants({ variant: "ghost", size }), "rounded-full bg-background px-5 hover:bg-background/70");

/** Pill action on a sage gradient field. */
export const pillOnGlow = cn(
  buttonVariants({ size: "lg" }),
  "rounded-full bg-background px-5 text-foreground hover:bg-background/90 hover:opacity-100",
);

