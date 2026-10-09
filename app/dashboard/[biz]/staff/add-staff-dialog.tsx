"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { saveProviderAction } from "@/lib/dashboard/actions/catalog";

export function AddStaffDialog({ slug, services }: { slug: string; services: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveProviderAction.bind(null, slug), null);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Add staff
        </Button>
      </DialogTrigger>
      <DialogContent title="Add staff member" description="You can set their hours and time off next.">
        <form action={action} className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="p-name" error={state?.fields?.name?.[0]}>
              <Input id="p-name" name="name" placeholder="Dr. Min Thu" required autoFocus />
            </Field>
            <Field label="Title (optional)" htmlFor="p-title">
              <Input id="p-title" name="title" placeholder="Dentist" />
            </Field>
          </div>
          {services.length ? (
            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Services they provide</legend>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {services.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
                    <input type="checkbox" name="serviceIds" value={s.id} defaultChecked className="accent-foreground" />
                    {s.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null} Add staff member
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
