"use client";

import Link from "next/link";
import { Phrases } from "@/components/i18n/phrases";
import type { ReactNode } from "react";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <h1 className="text-3xl leading-tight font-medium tracking-[-0.03em]">
          <Phrases text={title} />
        </h1>
        {description ? <p className="text-[15px] text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid gap-4">{children}</div>
      {footer ? <p className="border-t pt-5 text-sm text-muted-foreground">{footer}</p> : null}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
      {children}
    </Link>
  );
}
