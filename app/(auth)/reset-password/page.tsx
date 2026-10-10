"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/misc";
import { authClient } from "@/lib/auth-client";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { AuthCard, TextLink } from "../auth-form";

function ResetForm() {
  const { t } = useSiteCopy();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [error, setError] = useState<string | null>(params.get("error") ? t.auth.invalidLink : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    setPending(true);
    const { error } = await authClient.resetPassword({
      token,
      newPassword: String(new FormData(e.currentTarget).get("password")),
    });
    if (error) {
      setPending(false);
      setError(error.message ?? t.auth.reset.failed);
      return;
    }
    router.replace("/sign-in");
  }

  if (!token) return <p className="text-sm">{t.auth.invalidLink}</p>;
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label={t.auth.reset.newPassword} htmlFor="password" hint={t.auth.passwordHint} required>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          autoFocus
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
        />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner /> : null}
        {t.auth.reset.submit}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useSiteCopy();
  return (
    <AuthCard title={t.auth.reset.title} footer={<TextLink href="/sign-in">{t.auth.backToSignIn}</TextLink>}>
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthCard>
  );
}
