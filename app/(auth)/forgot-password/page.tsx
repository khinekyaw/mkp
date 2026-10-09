"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { authClient } from "@/lib/auth-client";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { AuthCard, TextLink } from "../auth-form";

export default function ForgotPasswordPage() {
  const { t } = useSiteCopy();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    await authClient.requestPasswordReset({
      email: String(new FormData(e.currentTarget).get("email")),
      redirectTo: "/reset-password",
    });
    // Same message whether or not the account exists.
    setSent(true);
    setPending(false);
  }

  return (
    <AuthCard title={t.auth.forgot.title} footer={<TextLink href="/sign-in">{t.auth.backToSignIn}</TextLink>}>
      {sent ? (
        <p className="text-sm">{t.auth.forgot.sent}</p>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4">
          <Field label={t.auth.email} htmlFor="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null}
            {t.auth.forgot.submit}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
