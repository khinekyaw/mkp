"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { signUp } from "@/lib/auth-client";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { AuthCard, TextLink } from "../auth-form";

export default function SignUpPage() {
  const { t } = useSiteCopy();
  const [error, setError] = useState<string | null>(null);
  // Set once the account exists; no session until the confirmation link is opened.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const email = String(form.get("email")).trim();
    const { error } = await signUp.email({
      name: String(form.get("name")).trim(),
      email,
      password: String(form.get("password")),
      callbackURL: "/onboarding",
    });
    setPending(false);
    if (error) {
      setError(error.message ?? t.auth.signUp.failed);
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthCard title={t.auth.signUp.checkTitle} footer={<TextLink href="/sign-in">{t.auth.backToSignIn}</TextLink>}>
        <p className="text-sm">{t.auth.signUp.checkBody(sentTo)}</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t.auth.signUp.title}
      description={t.auth.signUp.description}
      footer={
        <>
          {t.auth.signUp.haveAccount} <TextLink href="/sign-in">{t.auth.signUp.signIn}</TextLink>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4">
        <Field label={t.auth.signUp.name} htmlFor="name" required>
          <Input id="name" name="name" autoComplete="name" required minLength={2} autoFocus />
        </Field>
        <Field label={t.auth.email} htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label={t.auth.password} htmlFor="password" hint={t.auth.passwordHint} required>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </Field>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : null}
          {t.auth.signUp.submit}
        </Button>
      </form>
    </AuthCard>
  );
}
