import type { ComponentProps } from "react";
import { googleFontsHref, themeToCssVars, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Applies a theme's tokens (and web font) to everything inside it. */
export function ThemeScope({
  theme,
  className,
  style,
  children,
  ...props
}: ComponentProps<"div"> & { theme: Theme }) {
  const fontHref = googleFontsHref(theme.googleFonts);
  return (
    <div
      style={{ ...themeToCssVars(theme), ...style }}
      className={cn("bg-background font-sans text-foreground", className)}
      {...props}
    >
      {/* No `precedence`: a font that fails to load should fail silently, not suspend. */}
      {fontHref ? <link rel="stylesheet" href={fontHref} /> : null}
      {children}
    </div>
  );
}
