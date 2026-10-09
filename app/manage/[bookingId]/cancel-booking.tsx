"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { MESSAGES, type Locale } from "@/lib/i18n";
import { cancelByCustomer } from "./actions";

export function CancelBooking({ bookingId, token, locale }: { bookingId: string; token: string; locale: Locale }) {
  const t = MESSAGES[locale];
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(cancelByCustomer, null);

  if (state?.ok) return <p className="text-sm">{t.cancelled}</p>;
  if (!confirming) {
    return (
      <Button variant="outline" className="w-fit" onClick={() => setConfirming(true)}>
        {t.cancelAppointment}
      </Button>
    );
  }
  return (
    <form action={action} className="grid gap-3 rounded-lg border p-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="token" value={token} />
      <p className="text-sm font-medium">{t.cancelConfirm}</p>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {t.yesCancel}
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
          {t.keep}
        </Button>
      </div>
    </form>
  );
}
