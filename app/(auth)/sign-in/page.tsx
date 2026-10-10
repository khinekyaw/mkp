"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Spinner } from "@/components/ui/misc";
import { signIn } from "@/lib/auth-client";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { AuthCard, TextLink } from "../auth-form";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function SignInForm() {
  const { t } = useSiteCopy();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
      // Where the fresh confirmation link lands if the email isn't verified yet.
      callbackURL: next,
    });
    if (error) {
      setPending(false);
      setError(
        error.status === 401
          ? t.auth.signIn.wrong
          : error.code === "EMAIL_NOT_VERIFIED"
            ? t.auth.signIn.unverified
            : (error.message ?? t.auth.signIn.failed),
      );
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <Field label={t.auth.email} htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field label={t.auth.password} htmlFor="password" hint={<TextLink href="/forgot-password">{t.auth.signIn.forgot}</TextLink>} required>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
        />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner /> : null}
        {t.auth.signIn.submit}
      </Button>
    </form>
  );
}

export default function SignInPage() {
  const { t } = useSiteCopy();
  return (
    <AuthCard
      title={t.auth.signIn.title}
      footer={
        <>
          {t.auth.signIn.newHere} <TextLink href="/sign-up">{t.auth.signIn.create}</TextLink>
        </>
      }
    >
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
