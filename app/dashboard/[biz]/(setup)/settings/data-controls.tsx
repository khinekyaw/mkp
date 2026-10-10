"use client";

import { Download } from "lucide-react";
import { useActionState, useState } from "react";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { deleteBusinessAction } from "@/lib/dashboard/actions/business";

export function DataControls({ slug, graceDays }: { slug: string; graceDays: number }) {
  const { t } = useSiteCopy();
  const d = t.dash.data;
  const [state, action, pending] = useActionState(deleteBusinessAction.bind(null, slug), null);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <a href={`/dashboard/${slug}/export`} download className={buttonVariants({ variant: "outline", className: "w-fit" })}>
          <Download /> {d.export}
        </a>
        <p className="text-xs text-muted-foreground">{d.exportHelp}</p>
      </div>
      <div className="grid gap-3 border-t pt-5">
        <p className="text-sm font-medium">{d.deleteTitle}</p>
        <p className="text-xs text-muted-foreground">{d.deleteBody(graceDays)}</p>
        {confirming ? (
          <form action={action} className="grid gap-3">
            <Field label={d.deleteConfirm(slug)} htmlFor="del-confirm" error={state?.fields?.confirm?.[0]} required>
              <Input id="del-confirm" name="confirm" autoComplete="off" required />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending} className="bg-tone-red text-white hover:bg-tone-red/90">
                {pending ? <Spinner /> : null} {d.deleteButton}
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
                {t.dash.common.close}
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" className="w-fit text-tone-red" onClick={() => setConfirming(true)}>
            {d.deleteButton}
          </Button>
        )}
      </div>
    </div>
  );
}
