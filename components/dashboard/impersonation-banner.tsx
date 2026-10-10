"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { authClient } from "@/lib/auth-client";

/** Always visible while a platform admin is signed in as someone else. */
export function ImpersonationBanner({ name }: { name: string }) {
  const { t } = useSiteCopy();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-tone-amber-soft px-4 py-2.5 text-sm text-tone-amber">
      <span>{t.admin.impersonating(name)}</span>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await authClient.admin.stopImpersonating();
            router.replace("/admin");
            router.refresh();
          })
        }
      >
        {pending ? <Spinner /> : null} {t.admin.stopImpersonating}
      </Button>
    </div>
  );
}
