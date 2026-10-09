"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Call to action under the landing-page studio. */
export function StudioCta() {
  const { t } = useSiteCopy();
  return (
    <div className="grid gap-3 rounded-2xl bg-muted p-4">
      <p className="text-sm">{t.studio.cta}</p>
      <Link href="/sign-up" className={cn(buttonVariants(), "w-fit rounded-full px-5")}>
        {t.studio.ctaButton} <ArrowRight />
      </Link>
    </div>
  );
}
