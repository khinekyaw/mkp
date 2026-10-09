import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Standard dashboard page header: title, description, actions. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="grid min-w-0 gap-1.5">
        <h1 className="text-3xl leading-tight font-medium tracking-[-0.03em] sm:text-[2.5rem]">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid justify-items-center gap-3 rounded-lg border border-dashed bg-background/60 px-6 py-14 text-center", className)}>
      {icon ? <div className="text-muted-foreground [&_svg]:size-6">{icon}</div> : null}
      <div className="grid gap-1">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
