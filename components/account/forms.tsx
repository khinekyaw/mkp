"use client";

import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useState, type FormEvent, type ReactNode } from "react";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { PasswordInput } from "@/components/ui/password-input";
import { SettingsRow } from "@/components/ui/settings";
import { toast } from "@/components/ui/toaster";
import { authClient } from "@/lib/auth-client";

// Account settings as rows. Rarely used or sensitive changes (email, password,
// two-step verification, deleting the account) open a dialog instead of
// sitting on the page as open forms.

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

function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p className="text-sm text-red-600">{children}</p> : null;
}

const dangerButton = "border-tone-red/30 text-tone-red hover:bg-tone-red-soft";

export function NameRow({ name }: { name: string }) {
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
    <SettingsRow label={a.name} htmlFor="acc-name" description={a.profileBody} error={error}>
      <form onSubmit={onSubmit} className="flex w-full gap-2 sm:w-72">
        <Input id="acc-name" name="name" defaultValue={name} required minLength={2} maxLength={80} autoComplete="name" />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? <Spinner /> : a.save}
        </Button>
      </form>
    </SettingsRow>
  );
}

export function EmailRow({ email }: { email: string }) {
  const { t } = useSiteCopy();
  const a = t.dash.account;
  const [open, setOpen] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { pending, error, setError, run } = useAuthCall();
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
    <SettingsRow label={a.email} description={a.emailBody}>
      <div className="flex w-full items-center justify-between gap-3 sm:w-72">
        <span className="truncate text-sm">{email}</span>
        <Button variant="outline" onClick={() => setOpen(true)}>
          {a.change}
        </Button>
      </div>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setSentTo(null);
            setError(null);
          }
        }}
      >
        <DialogContent title={a.changeEmail} description={a.emailBody}>
          {sentTo ? (
            <p className="text-sm">{a.emailSent(sentTo)}</p>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <Field label={a.newEmail} htmlFor="acc-email" required>
                <Input id="acc-email" name="email" type="email" required autoComplete="email" autoFocus />
              </Field>
              <ErrorText>{error}</ErrorText>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null} {a.changeEmail}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </SettingsRow>
  );
}

export function PasswordRow() {
  const { t } = useSiteCopy();
  const a = t.dash.account;
  const [open, setOpen] = useState(false);
  const { pending, error, setError, run } = useAuthCall();
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
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
      setOpen(false);
    }
  }
  return (
    <SettingsRow label={a.password} description={a.passwordBody}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {a.changePassword}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setError(null);
        }}
      >
        <DialogContent title={a.changePassword} description={a.passwordBody}>
          <form onSubmit={onSubmit} className="grid gap-4">
            <Password id="current" label={a.currentPassword} autoComplete="current-password" />
            <Password id="new" label={a.newPassword} autoComplete="new-password" />
            <p className="-mt-2 text-xs text-muted-foreground">{t.auth.passwordHint}</p>
            <ErrorText>{error}</ErrorText>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null} {a.changePassword}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </SettingsRow>
  );
}

type Setup = { qr: string; secret: string; backupCodes: string[] };

/** Turn two-step verification on (password → scan → code) or off (password), in a dialog. */
export function TwoFactorSettings({ enabled }: { enabled: boolean }) {
  const { t } = useSiteCopy();
  const a = t.dash.account;
  const router = useRouter();
  const { pending, error, setError, run } = useAuthCall();
  const [open, setOpen] = useState(false);
  const [setup, setSetup] = useState<Setup | null>(null);

  async function confirmPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("tf-password") ?? "");
    const wrong = (err: AuthError) => (isWrongPassword(err) ? a.wrongPassword : (err.message ?? t.dash.common.somethingWrong));
    if (enabled) {
      const { error } = await run(() => authClient.twoFactor.disable({ password }), wrong);
      if (!error) {
        toast.success(a.twoFactorDisabled);
        setOpen(false);
        router.refresh();
      }
      return;
    }
    const { data, error } = await run(() => authClient.twoFactor.enable({ password }), wrong);
    // Only authenticator apps are configured (no OTP-by-email), so a TOTP setup comes back.
    if (error || !data || data.method !== "totp") return;
    setSetup({
      qr: await QRCode.toDataURL(data.totpURI, { margin: 1, width: 176 }),
      secret: new URL(data.totpURI).searchParams.get("secret") ?? "",
      backupCodes: data.backupCodes,
    });
  }

  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get("tf-code") ?? "").replace(/\s/g, "");
    const { error } = await run(() => authClient.twoFactor.verifyTotp({ code }), () => a.wrongCode);
    if (!error) {
      toast.success(a.twoFactorEnabled);
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button variant={enabled ? "outline" : "default"} onClick={() => setOpen(true)}>
        {enabled ? a.turnOff : a.turnOn}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setSetup(null);
            setError(null);
          }
        }}
      >
        <DialogContent title={a.twoFactor} description={setup ? a.scan : enabled ? a.twoFactorOn : a.twoFactorOff}>
          {setup ? (
            <form onSubmit={verify} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
                {/* eslint-disable-next-line @next/next/no-img-element -- a generated data URL */}
                <img src={setup.qr} alt="" width={176} height={176} className="rounded-md border bg-white p-1" />
                <div className="grid gap-1.5 rounded-md bg-muted p-3">
                  <p className="text-sm font-medium">{a.backupCodes}</p>
                  <p className="text-xs text-muted-foreground">{a.backupHelp}</p>
                  <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
                    {setup.backupCodes.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {a.manualKey} <code className="font-mono break-all text-foreground">{setup.secret}</code>
              </p>
              <Field label={a.code} htmlFor="tf-code" required>
                <Input id="tf-code" name="tf-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required autoFocus />
              </Field>
              <ErrorText>{error}</ErrorText>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null} {a.verify}
              </Button>
            </form>
          ) : (
            <form onSubmit={confirmPassword} className="grid gap-4">
              <Password id="tf-password" label={a.confirmPassword} autoComplete="current-password" />
              <ErrorText>{error}</ErrorText>
              <Button type="submit" disabled={pending} variant={enabled ? "outline" : "default"} className={enabled ? dangerButton : undefined}>
                {pending ? <Spinner /> : null} {enabled ? a.turnOff : a.continue}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TwoFactorRow({ enabled }: { enabled: boolean }) {
  const { t } = useSiteCopy();
  const a = t.dash.account;
  return (
    <SettingsRow
      label={
        <span className="inline-flex items-center gap-2">
          {a.twoFactor}
          <Badge variant={enabled ? "default" : "muted"}>{enabled ? a.statusOn : a.statusOff}</Badge>
        </span>
      }
      description={enabled ? a.twoFactorOn : a.twoFactorOff}
    >
      <TwoFactorSettings enabled={enabled} />
    </SettingsRow>
  );
}

export function DevicesRow() {
  const { t } = useSiteCopy();
  const a = t.dash.account;
  const { pending, error, run } = useAuthCall();
  async function onClick() {
    const { error } = await run(() => authClient.revokeOtherSessions(), () => t.dash.common.somethingWrong);
    if (!error) toast.success(a.signedOutOthers);
  }
  return (
    <SettingsRow label={a.devices} description={a.devicesBody} error={error}>
      <Button variant="outline" onClick={onClick} disabled={pending}>
        {pending ? <Spinner /> : null} {a.signOutOthers}
      </Button>
    </SettingsRow>
  );
}

export function DeleteAccountRow() {
  const { t } = useSiteCopy();
  const a = t.dash.account;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { pending, error, setError, run } = useAuthCall();
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
  return (
    <SettingsRow label={a.deleteTitle} description={a.deleteBody}>
      <Button variant="outline" className={dangerButton} onClick={() => setOpen(true)}>
        {a.deleteButton}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setError(null);
        }}
      >
        <DialogContent title={a.deleteTitle} description={a.deleteBody}>
          <form onSubmit={onSubmit} className="grid gap-4">
            <Password id="del-password" label={a.confirmPassword} autoComplete="current-password" />
            <ErrorText>{error}</ErrorText>
            <Button type="submit" disabled={pending} className="bg-tone-red text-white hover:bg-tone-red/90">
              {pending ? <Spinner /> : null} {a.deleteButton}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </SettingsRow>
  );
}
