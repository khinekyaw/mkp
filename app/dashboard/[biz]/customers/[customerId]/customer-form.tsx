"use client";

import { useActionState } from "react";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { updateCustomerAction } from "@/lib/dashboard/actions/customers";

type Customer = { id: string; name: string; email: string | null; notes: string | null };

export function CustomerForm({ slug, customer }: { slug: string; customer: Customer }) {
  const [state, action, pending] = useActionState(updateCustomerAction.bind(null, slug, customer.id), null);
  useActionFeedback(state);
  return (
    <form action={action} className="grid gap-3">
      <Field label="Name" htmlFor="c-name" error={state?.fields?.name?.[0]}>
        <Input id="c-name" name="name" defaultValue={customer.name} required />
      </Field>
      <Field label="Email" htmlFor="c-email" error={state?.fields?.email?.[0]}>
        <Input id="c-email" name="email" type="email" defaultValue={customer.email ?? ""} />
      </Field>
      <Field label="Private notes" htmlFor="c-notes" hint="Only visible to your team.">
        <Textarea id="c-notes" name="notes" rows={5} defaultValue={customer.notes ?? ""} placeholder="Allergies, preferences…" />
      </Field>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Spinner /> : null} Save
      </Button>
    </form>
  );
}
