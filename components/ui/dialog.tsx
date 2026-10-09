"use client";

import { X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { cn } from "@/lib/utils";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogContent({
  title,
  description,
  className,
  children,
  ...props
}: ComponentProps<typeof RadixDialog.Content> & { title: ReactNode; description?: ReactNode }) {
  const { locale, t } = useSiteCopy();
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <RadixDialog.Content
        lang={locale}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg border bg-background p-5 shadow-lg outline-none sm:p-6",
          className,
        )}
        {...props}
      >
        <div className="grid gap-1 pr-8">
          <RadixDialog.Title className="text-base font-semibold tracking-tight">{title}</RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className="text-sm text-muted-foreground">{description}</RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          )}
        </div>
        {children}
        <RadixDialog.Close
          className="absolute top-4 right-4 grid size-8 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t.dash.common.close}
        >
          <X className="size-4" />
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
