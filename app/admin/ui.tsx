"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { toast } from "@/components/ui/toaster";
import type { ActionState } from "@/lib/actions";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", key: "overview" },
  { href: "/admin/businesses", key: "businesses" },
  { href: "/admin/users", key: "users" },
  { href: "/admin/billing", key: "billing" },
  { href: "/admin/jobs", key: "jobs" },
  { href: "/admin/audit", key: "audit" },
  { href: "/admin/settings", key: "settings" },
] as const;

export function AdminNav() {
  const { t } = useSiteCopy();
  const pathname = usePathname();
  return (
    <nav aria-label={t.admin.title} className="flex gap-0.5 overflow-x-auto rounded-full bg-muted p-1 scrollbar-none">
      {NAV.map((n) => {
        const active = n.href === "/admin" ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.admin.nav[n.key]}
          </Link>
        );
      })}
    </nav>
  );
}

function report(res: ActionState, fallback: string) {
  if (res?.ok) toast.success(res.message ?? fallback);
  else toast.error(res?.error ?? fallback);
}

/** One-click admin action with a toast. */
export function ActButton({ action, children, ...props }: { action: () => Promise<ActionState>; children: ReactNode } & Omit<ButtonProps, "action">) {
  const { t } = useSiteCopy();
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => report(await action(), t.admin.common.done))} {...props}>
      {pending ? <Spinner /> : null} {children}
    </Button>
  );
}

/** Admin action that requires a written reason (kept in the audit log). */
export function ReasonButton({
  action,
  children,
  help,
  danger,
}: {
  action: (reason: string) => Promise<ActionState>;
  children: ReactNode;
  help?: string;
  danger?: boolean;
}) {
  const { t } = useSiteCopy();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <Button size="sm" variant="outline" className={cn(danger && "text-tone-red")} onClick={() => setOpen(true)}>
        {children}
      </Button>
    );
  }
  return (
    <div className="grid w-full max-w-md gap-2 rounded-md border p-3">
      {help ? <p className="text-xs text-muted-foreground">{help}</p> : null}
      <Input placeholder={t.admin.common.reason} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending || !reason.trim()}
          className={cn(danger && "bg-tone-red text-white hover:bg-tone-red/90")}
          onClick={() =>
            start(async () => {
              const res = await action(reason);
              report(res, t.admin.common.done);
              if (res?.ok) {
                setOpen(false);
                setReason("");
              }
            })
          }
        >
          {pending ? <Spinner /> : null} {children}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          {t.dash.common.close}
        </Button>
      </div>
    </div>
  );
}

/** Wraps a `(prev, form)` Server Action form with toasts. Pair with SubmitButton. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  useActionFeedback(state);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error ? <p className="text-sm text-red-600 sm:col-span-full">{state.error}</p> : null}
    </form>
  );
}

export function SubmitButton({ children, ...props }: { children: ReactNode } & ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? <Spinner /> : null} {children}
    </Button>
  );
}
