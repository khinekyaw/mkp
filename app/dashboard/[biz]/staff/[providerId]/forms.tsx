"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { WeeklyHoursEditor } from "@/components/dashboard/weekly-hours-editor";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { deleteProviderAction, saveProviderAction, saveProviderHoursAction } from "@/lib/dashboard/actions/catalog";

type Provider = { id: string; name: string; title: string | null; bio: string | null; active: boolean; serviceIds: string[] };

export function ProfileForm({ slug, provider, services }: { slug: string; provider: Provider; services: { id: string; name: string; active: boolean }[] }) {
  const [state, action, pending] = useActionState(saveProviderAction.bind(null, slug), null);
  const [deleting, startDelete] = useTransition();
  useActionFeedback(state);
  const { t } = useSiteCopy();
  const st = t.dash.staff;
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={provider.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t.dash.common.name} htmlFor="p-name" error={state?.fields?.name?.[0]}>
          <Input id="p-name" name="name" defaultValue={provider.name} required />
        </Field>
        <Field label={st.jobTitle} htmlFor="p-title">
          <Input id="p-title" name="title" defaultValue={provider.title ?? ""} placeholder={st.titlePlaceholderLong} />
        </Field>
      </div>
      <Field label={st.bio} htmlFor="p-bio">
        <Textarea id="p-bio" name="bio" rows={2} defaultValue={provider.bio ?? ""} />
      </Field>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{st.services}</legend>
        {services.length ? (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {services.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
                <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={provider.serviceIds.includes(s.id)} className="accent-foreground" />
                <span className={s.active ? "" : "text-muted-foreground"}>{s.name}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{st.noServices}</p>
        )}
      </fieldset>
      <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
        <span className="grid">
          <span className="text-sm font-medium">{st.accepting}</span>
          <span className="text-xs text-muted-foreground">{st.acceptingHint}</span>
        </span>
        <Switch name="active" defaultChecked={provider.active} />
      </label>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null} {t.dash.common.save}
        </Button>
        <Button
          variant="ghost"
          className="ml-auto text-red-600"
          disabled={deleting}
          onClick={() =>
            startDelete(async () => {
              if (!confirm(st.confirmRemove(provider.name))) return;
              const res = await deleteProviderAction(slug, provider.id);
              if (res?.message) toast.success(res.message);
            })
          }
        >
          <Trash2 /> {t.dash.common.remove}
        </Button>
      </div>
    </form>
  );
}

export function ProviderHoursForm({
  slug,
  providerId,
  useBusinessHours,
  schedule,
}: {
  slug: string;
  providerId: string;
  useBusinessHours: boolean;
  schedule: { weekday: number; startMin: number; endMin: number }[];
}) {
  const [inherit, setInherit] = useState(useBusinessHours);
  const [state, action, pending] = useActionState(saveProviderHoursAction.bind(null, slug, providerId), null);
  useActionFeedback(state);
  const { t } = useSiteCopy();
  return (
    <form action={action} className="grid gap-4">
      <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
        <span className="text-sm font-medium">{t.dash.staff.sameAsClinic}</span>
        <Switch name="useBusinessHours" checked={inherit} onCheckedChange={setInherit} />
      </label>
      <WeeklyHoursEditor initial={schedule} disabled={inherit} />
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Spinner /> : null} {t.dash.staff.saveHours}
      </Button>
    </form>
  );
}
