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
import { deleteProviderAction, saveProviderAction, saveProviderHoursAction } from "@/lib/dashboard/actions/catalog";

type Provider = { id: string; name: string; title: string | null; bio: string | null; active: boolean; serviceIds: string[] };

export function ProfileForm({ slug, provider, services }: { slug: string; provider: Provider; services: { id: string; name: string; active: boolean }[] }) {
  const [state, action, pending] = useActionState(saveProviderAction.bind(null, slug), null);
  const [deleting, startDelete] = useTransition();
  useActionFeedback(state);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={provider.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="p-name" error={state?.fields?.name?.[0]}>
          <Input id="p-name" name="name" defaultValue={provider.name} required />
        </Field>
        <Field label="Title" htmlFor="p-title">
          <Input id="p-title" name="title" defaultValue={provider.title ?? ""} placeholder="General Practitioner" />
        </Field>
      </div>
      <Field label="Short bio (optional)" htmlFor="p-bio">
        <Textarea id="p-bio" name="bio" rows={2} defaultValue={provider.bio ?? ""} />
      </Field>
      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Services</legend>
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
          <p className="text-sm text-muted-foreground">No services yet.</p>
        )}
      </fieldset>
      <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
        <span className="grid">
          <span className="text-sm font-medium">Accepting bookings</span>
          <span className="text-xs text-muted-foreground">Turn off when someone leaves; their history is kept.</span>
        </span>
        <Switch name="active" defaultChecked={provider.active} />
      </label>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null} Save
        </Button>
        <Button
          variant="ghost"
          className="ml-auto text-red-600"
          disabled={deleting}
          onClick={() =>
            startDelete(async () => {
              if (!confirm(`Remove ${provider.name}?`)) return;
              const res = await deleteProviderAction(slug, provider.id);
              if (res?.message) toast.success(res.message);
            })
          }
        >
          <Trash2 /> Remove
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
  return (
    <form action={action} className="grid gap-4">
      <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
        <span className="text-sm font-medium">Same as clinic opening hours</span>
        <Switch name="useBusinessHours" checked={inherit} onCheckedChange={setInherit} />
      </label>
      <WeeklyHoursEditor initial={schedule} disabled={inherit} />
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Spinner /> : null} Save hours
      </Button>
    </form>
  );
}
