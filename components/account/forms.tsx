"use client";

import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useState, type FormEvent } from "react";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "@/components/ui/toaster";
import { authClient } from "@/lib/auth-client";

/** Runs an auth-client call with a pending flag and an error message. */
function useAuthCall() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run<T extends { error: unknown }>(call: () => Promise<T>, onError: (e: NonNullable<T["error"]>) => string) {
    setPending(true);
    setError(null);
    const result = await call();
    setPending(false);
    if (result.error) setError(onError(result.error as NonNullable<T["error"]>));
    return result;
  }
  return { pending, error, setError, run };
}

type AuthError = { status?: number; code?: string; message?: string };
const isWrongPassword = (e: AuthError) => e.code === "INVALID_PASSWORD" || e.status === 401;

function Password({ id, label, autoComplete }: { id: string; label: string; autoComplete: string }) {
  const { t } = useSiteCopy();
  return (
    <Field label={label} htmlFor={id} required>
      <PasswordInput
        id={id}
        name={id}
        autoComplete={autoComplete}
        required
        minLength={8}
        showLabel={t.auth.showPassword}
        hideLabel={t.auth.hidePassword}
      />
    </Field>
  );
}

export function NameForm({ name }: { name: string }) {
  const { t } = useSiteCopy();
  const a = t.dash.account;
  const router = useRouter();
  const { pending, error, run } = useAuthCall();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    const { error } = await run(() => authClient.updateUser({ name: value }), () => t.dash.common.somethingWrong);
    if (!error) {
      toast.success(a.nameSaved);
      router.refresh();
    }
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Field label={a.name} htmlFor="acc-name" required>
        <Input id="acc-name" name="name" defaultValue={name} required minLength={2} maxLength={80} autoComplete="name" />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" variant="outline" disabled={pending} className="w-fit">
        {pending ? <Spinner /> : null} {a.saveName}
      </Button>
    </form>
  );
}

export function EmailForm({ email }: { email: string }) {
  const { t } = useSiteCopy();
  const a = t.dash.account;
  const { pending, error, run } = useAuthCall();
  const [sentTo, setSentTo] = useState<string | null>(null);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newEmail = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    const { error } = await run(
      () => authClient.changeEmail({ newEmail, callbackURL: window.location.pathname }),
      (err: AuthError) => err.message ?? t.dash.common.somethingWrong,
    );
    if (!error) setSentTo(newEmail);
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 border-t pt-5">
      <p className="text-sm">
        <span className="text-muted-foreground">{a.email}:</span> {email}
      </p>
      {sentTo ? (
        <p className="text-sm">{a.emailSent(sentTo)}</p>
      ) : (
        <>
          <Field label={a.newEmail} htmlFor="acc-email" required>
            <Input id="acc-email" name="email" type="email" required autoComplete="email" />
          </Field>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" variant="outline" disabled={pending} className="w-fit">
            {pending ? <Spinner /> : null} {a.changeEmail}
          </Button>
        </>
      )}
    </form>
  );
}

export function PasswordForm() {
  const { t } = useSiteCopy();
  const a = t.dash.account;
  const { pending, error, run } = useAuthCall();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const { error } = await run(
      () =>
        authClient.changePassword({
          currentPassword: String(data.get("current") ?? ""),
          newPassword: String(data.get("new") ?? ""),
          revokeOtherSessions: true,
        }),
      (err: AuthError) => (isWrongPassword(err) ? a.wrongPassword : (err.message ?? t.dash.common.somethingWrong)),
    );
    if (!error) {
      toast.success(a.passwordChanged);
      form.reset();
    }
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Password id="current" label={a.currentPassword} autoComplete="current-password" />
      <Password id="new" label={a.newPassword} autoComplete="new-password" />
      <p className="text-xs text-muted-foreground">{t.auth.passwordHint}</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Spinner /> : null} {a.changePassword}
      </Button>
    </form>
  );
}

type Setup = { qr: string; secret: string; backupCodes: string[] };

export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const { t } = useSiteCopy();
  const a = t.dash.account;
  const router = useRouter();
  const { pending, error, setError, run } = useAuthCall();
  const [step, setStep] = useState<"idle" | "password" | "scan">("idle");
  const [setup, setSetup] = useState<Setup | null>(null);

  async function confirmPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("tf-password") ?? "");
    const wrong = (err: AuthError) => (isWrongPassword(err) ? a.wrongPassword : (err.message ?? t.dash.common.somethingWrong));
    if (enabled) {
      const { error } = await run(() => authClient.twoFactor.disable({ password }), wrong);
      if (!error) {
        toast.success(a.twoFactorDisabled);
        setStep("idle");
        router.refresh();
      }
      return;
    }
    const { data, error } = await run(() => authClient.twoFactor.enable({ password }), wrong);
    // Only authenticator apps are configured (no OTP-by-email), so a TOTP setup comes back.
    if (error || !data || data.method !== "totp") return;
    setSetup({
      qr: await QRCode.toDataURL(data.totpURI, { margin: 1, width: 192 }),
      secret: new URL(data.totpURI).searchParams.get("secret") ?? "",
      backupCodes: data.backupCodes,
    });
    setStep("scan");
  }

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("tf-code") ?? "").replace(/\s/g, "");
    const { error } = await run(() => authClient.twoFactor.verifyTotp({ code }), () => a.wrongCode);
    if (!error) {
      toast.success(a.twoFactorEnabled);
      setStep("idle");
      setSetup(null);
      router.refresh();
    }
  }

  if (step === "idle") {
    return (
      <Button
        variant={enabled ? "outline" : "default"}
        onClick={() => {
          setError(null);
          setStep("password");
        }}
      >
        {enabled ? a.turnOff : a.turnOn}
      </Button>
    );
  }
  if (step === "password") {
    return (
      <form onSubmit={confirmPassword} className="grid gap-3">
        <Password id="tf-password" label={a.confirmPassword} autoComplete="current-password" />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null} {enabled ? a.turnOff : a.continue}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setStep("idle")}>
            {t.dash.common.close}
          </Button>
        </div>
      </form>
    );
  }
  return (
    <form onSubmit={verify} className="grid gap-4">
      <p className="text-sm">{a.scan}</p>
      {setup ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- a generated data URL */}
          <img src={setup.qr} alt="" width={192} height={192} className="rounded-md border bg-white p-1" />
          <p className="text-xs text-muted-foreground">
            {a.manualKey} <code className="break-all font-mono text-foreground">{setup.secret}</code>
          </p>
          <div className="grid gap-1.5 rounded-md bg-muted p-3">
            <p className="text-sm font-medium">{a.backupCodes}</p>
            <p className="text-xs text-muted-foreground">{a.backupHelp}</p>
            <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
              {setup.backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
      <Field label={a.code} htmlFor="tf-code" required>
        <Input id="tf-code" name="tf-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
      </Field>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Spinner /> : null} {a.verify}
      </Button>
    </form>
  );
}

export function SignOutOthers() {
  const { t } = useSiteCopy();
  const a = t.dash.account;
  const { pending, error, run } = useAuthCall();
  async function onClick() {
    const { error } = await run(() => authClient.revokeOtherSessions(), () => t.dash.common.somethingWrong);
    if (!error) toast.success(a.signedOutOthers);
  }
  return (
    <div className="grid gap-2">
      <Button variant="outline" onClick={onClick} disabled={pending} className="w-fit">
        {pending ? <Spinner /> : null} {a.signOutOthers}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function DeleteAccount() {
  const { t } = useSiteCopy();
  const a = t.dash.account;
  const router = useRouter();
  const { pending, error, run } = useAuthCall();
  const [confirming, setConfirming] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("del-password") ?? "");
    const { error } = await run(
      () => authClient.deleteUser({ password }),
      (err: AuthError) =>
        err.code === "SOLE_OWNER" || err.message === "SOLE_OWNER"
          ? a.soleOwner
          : isWrongPassword(err)
            ? a.wrongPassword
            : (err.message ?? t.dash.common.somethingWrong),
    );
    if (!error) {
      router.replace("/");
      router.refresh();
    }
  }
  if (!confirming) {
    return (
      <Button variant="outline" className="w-fit text-tone-red" onClick={() => setConfirming(true)}>
        {a.deleteButton}
      </Button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Password id="del-password" label={a.confirmPassword} autoComplete="current-password" />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="bg-tone-red text-white hover:bg-tone-red/90">
          {pending ? <Spinner /> : null} {a.deleteButton}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
          {t.dash.common.close}
        </Button>
      </div>
    </form>
  );
}
