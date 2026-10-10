"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { saveProviderAction } from "@/lib/dashboard/actions/catalog";

export function AddStaffDialog({ slug, services }: { slug: string; services: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveProviderAction.bind(null, slug), null);
  const { t } = useSiteCopy();
  const st = t.dash.staff;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus /> {st.add}
        </Button>
      </DialogTrigger>
      <DialogContent title={st.addTitle} description={st.addDescription}>
        <form action={action} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t.dash.common.name} htmlFor="p-name" error={state?.fields?.name?.[0]} required>
              <Input id="p-name" name="name" placeholder={st.namePlaceholder} required autoFocus />
            </Field>
            <Field label={st.jobTitleOptional} htmlFor="p-title">
              <Input id="p-title" name="title" placeholder={st.titlePlaceholder} />
            </Field>
          </div>
          {services.length ? (
            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{st.servicesTheyProvide}</legend>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {services.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50 has-checked:border-primary/40 has-checked:bg-primary/5">
                    <Checkbox name="serviceIds" value={s.id} defaultChecked />
                    {s.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null} {st.addTitle}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
