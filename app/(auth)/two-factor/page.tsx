"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { authClient } from "@/lib/auth-client";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { AuthCard, safeNext, TextLink } from "../auth-form";

/** Second step of sign-in for accounts with two-step verification on. */
function TwoFactorForm() {
  const { t } = useSiteCopy();
  const tf = t.auth.twoFactor;
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [backup, setBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const code = String(form.get("code") ?? "").replace(/\s/g, "");
    setPending(true);
    setError(null);
    const { error } = backup
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code, trustDevice: form.get("trust") === "on" });
    if (error) {
      setPending(false);
      setError(tf.wrong);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <AuthCard
      title={tf.title}
      description={backup ? tf.backupDescription : tf.description}
      footer={<TextLink href="/sign-in">{t.auth.backToSignIn}</TextLink>}
    >
      <form onSubmit={onSubmit} className="grid gap-4" key={String(backup)}>
        <Field label={tf.code} htmlFor="code" required>
          <Input
            id="code"
            name="code"
            autoComplete="one-time-code"
            inputMode={backup ? "text" : "numeric"}
            required
            autoFocus
            maxLength={backup ? 32 : 6}
          />
        </Field>
        {!backup ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="trust" /> {tf.trust}
          </label>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {tf.submit}
        </Button>
        <button type="button" onClick={() => setBackup((b) => !b)} className="w-fit cursor-pointer text-sm text-muted-foreground underline-offset-4 hover:underline">
          {backup ? tf.useApp : tf.useBackup}
        </button>
      </form>
    </AuthCard>
  );
}

export default function TwoFactorPage() {
  return (
    <Suspense>
      <TwoFactorForm />
    </Suspense>
  );
}
