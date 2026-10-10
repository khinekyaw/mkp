"use client";

import { Download } from "lucide-react";
import { useActionState, useState } from "react";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { SettingsRow, SettingsSection } from "@/components/ui/settings";
import { deleteBusinessAction } from "@/lib/dashboard/actions/business";

export function DataControls({ slug, graceDays }: { slug: string; graceDays: number }) {
  const { t } = useSiteCopy();
  const d = t.dash.data;
  const [state, action, pending] = useActionState(deleteBusinessAction.bind(null, slug), null);
  const [typed, setTyped] = useState("");
  return (
    <SettingsSection title={d.title} description={d.body}>
      <SettingsRow label={d.export} description={d.exportHelp}>
        <a href={`/dashboard/${slug}/export`} download className={buttonVariants({ variant: "outline" })}>
          <Download /> {d.export}
        </a>
      </SettingsRow>
      <SettingsRow label={d.deleteTitle} description={d.deleteBody(graceDays)}>
        <Dialog onOpenChange={(open) => !open && setTyped("")}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-tone-red/30 text-tone-red hover:bg-tone-red-soft">
              {d.deleteButton}
            </Button>
          </DialogTrigger>
          <DialogContent title={d.deleteTitle} description={d.deleteBody(graceDays)}>
            <form action={action} className="grid gap-4">
              <Field label={d.deleteConfirm(slug)} htmlFor="del-confirm" error={state?.fields?.confirm?.[0]} required>
                <Input id="del-confirm" name="confirm" autoComplete="off" required value={typed} onChange={(e) => setTyped(e.target.value)} />
              </Field>
              <Button type="submit" disabled={pending || typed.trim() !== slug} className="bg-tone-red text-white hover:bg-tone-red/90">
                {pending ? <Spinner /> : null} {d.deleteButton}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </SettingsRow>
    </SettingsSection>
  );
}
