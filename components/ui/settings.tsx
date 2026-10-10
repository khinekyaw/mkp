import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Settings pages, the way most apps lay them out: one column of sections, each
// a short heading over a single card of rows. A row reads left to right (what
// it is and why, then the control) and stacks on phones. Sections that save
// together end in a footer bar with one button.

/** The narrow column settings pages sit in; long forms read better than wide ones. */
export function SettingsStack({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("grid w-full max-w-3xl gap-8", className)}>{children}</div>;
}

export function SettingsSection({
  title,
  description,
  danger,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Destructive actions: a red-tinted card, kept last on the page. */
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div className="grid gap-0.5 px-1">
        <h2 className={cn("text-base font-semibold tracking-tight", danger && "text-tone-red")}>{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className={cn("overflow-hidden rounded-[1.25rem] border bg-background", danger && "border-tone-red/30")}>{children}</div>
    </section>
  );
}

/**
 * One setting. `label` names it (and focuses `htmlFor`), `description` says
 * what it does, `children` is the control. `stack` puts a wide control (text
 * fields, long selects) under the label on every screen size; `inline` keeps a
 * small control (a switch) beside the label even on phones.
 */
export function SettingsRow({
  label,
  htmlFor,
  description,
  error,
  required,
  stack,
  inline,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  stack?: boolean;
  inline?: boolean;
  children?: ReactNode;
}) {
  const Label = htmlFor ? "label" : "span";
  return (
    <div
      className={cn(
        "grid gap-3 border-b px-5 py-4 last:border-b-0",
        inline
          ? "grid-cols-[minmax(0,1fr)_auto] items-center gap-6"
          : !stack && "sm:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] sm:items-center sm:gap-6",
      )}
    >
      <div className="grid min-w-0 gap-0.5">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
          {required ? (
            <span aria-hidden className="ml-0.5 text-red-600">
              *
            </span>
          ) : null}
        </Label>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children ? (
        <div className={cn("grid gap-1.5", inline ? "justify-items-end" : !stack && "sm:justify-items-end")}>
          {children}
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

/** The save bar closing a section that saves as one form. */
export function SettingsFooter({ hint, children }: { hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/60 px-5 py-3">
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
