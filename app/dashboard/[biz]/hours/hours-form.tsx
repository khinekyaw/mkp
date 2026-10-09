"use client";

import { useActionState } from "react";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { WeeklyHoursEditor } from "@/components/dashboard/weekly-hours-editor";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { saveBusinessHoursAction } from "@/lib/dashboard/actions/catalog";

type Interval = { weekday: number; startMin: number; endMin: number };

export function HoursForm({ slug, initial }: { slug: string; initial: Interval[] }) {
  const [state, action, pending] = useActionState(saveBusinessHoursAction.bind(null, slug), null);
  useActionFeedback(state);
  return (
    <form action={action} className="grid gap-4">
      <WeeklyHoursEditor initial={initial} />
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Spinner /> : null} Save hours
      </Button>
    </form>
  );
}
