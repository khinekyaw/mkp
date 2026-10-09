"use client";

import { useActionState, useState } from "react";
import { SplitLayout } from "@/components/brand/split-layout";
import { Avatar } from "@/components/ui/avatar";
import { Phrases } from "@/components/i18n/phrases";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { PROVIDER_LABEL, type Vertical } from "@/lib/business/settings";
import { STARTER_SERVICES } from "@/lib/business/starters";
import { fmtMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { createBusinessAction } from "./actions";

const VERTICALS: Vertical[] = ["clinic", "dental", "salon", "spa", "other"];

/** Live preview: the clinic's booking card fills in as the owner types. */
function LivePreview({ name, vertical, owner }: { name: string; vertical: Vertical; owner: string }) {
  const { locale, t } = useSiteCopy();
  const services = STARTER_SERVICES[vertical];
  return (
    <figure className="grid max-w-md gap-3">
      <div className="grid gap-5 rounded-[1.5rem] bg-background p-6 text-foreground shadow-[0_24px_48px_-24px_oklch(0.2_0.04_140/0.5)]">
        <p className={cn("min-h-[1.2em] text-3xl leading-tight font-medium tracking-[-0.03em] [overflow-wrap:anywhere]", !name && "text-muted-foreground")}>
          {name || t.onboarding.yourClinic}
        </p>
        <div className="flex items-center gap-2.5 border-y py-3">
          <Avatar name={owner} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{owner}</p>
            <p className="text-xs text-muted-foreground">{PROVIDER_LABEL[vertical][locale]}</p>
          </div>
        </div>
        <ul className="grid gap-2 text-sm">
          {services.map((s) => (
            <li key={s.name} className="flex items-baseline justify-between gap-4">
              <span>{locale === "my" ? s.nameMy : s.name}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">{fmtMinutes(s.durationMin)}</span>
            </li>
          ))}
        </ul>
        <div className="border-t pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground tabular-nums">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            {t.onboarding.hours}
          </span>
        </div>
      </div>
      <figcaption className="text-xs text-white/80">{t.onboarding.caption}</figcaption>
    </figure>
  );
}

export function OnboardingForm({ userName }: { userName: string }) {
  const { t } = useSiteCopy();
  const [state, action, pending] = useActionState(createBusinessAction, null);
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState<Vertical>("clinic");
  const err = (k: string) => state?.fields?.[k]?.[0];

  return (
    <SplitLayout logoHref="/dashboard" panel={<LivePreview name={name.trim()} vertical={vertical} owner={userName} />}>
      <div className="grid w-full max-w-md gap-8">
        <div className="grid gap-2">
          <h1 className="text-3xl leading-tight font-medium tracking-[-0.03em]">
            <Phrases text={t.onboarding.title} />
          </h1>
          <p className="text-[15px] text-muted-foreground">
            {t.onboarding.welcome(userName.split(" ")[0])}
          </p>
        </div>
        <form action={action} className="grid gap-4">
          <Field label={t.onboarding.businessName} htmlFor="name" error={err("name")} required>
            <Input
              id="name"
              name="name"
              placeholder="Golden Lotus Clinic"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.onboarding.type} htmlFor="vertical">
              <Select id="vertical" name="vertical" value={vertical} onChange={(e) => setVertical(e.target.value as Vertical)}>
                {VERTICALS.map((v) => (
                  <option key={v} value={v}>
                    {t.onboarding.verticals[v]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.onboarding.timezone} htmlFor="timezone" error={err("timezone")}>
              <TimezoneSelect id="timezone" name="timezone" defaultValue="Asia/Yangon" />
            </Field>
          </div>
          <Field label={t.onboarding.website} htmlFor="website" hint={t.onboarding.websiteHint} error={err("website")}>
            <Input id="website" name="website" placeholder="yourclinic.com" inputMode="url" spellCheck={false} />
          </Field>
          <Field label={t.onboarding.phone} htmlFor="phone" hint={t.onboarding.phoneHint}>
            <Input id="phone" name="phone" type="tel" placeholder="09 123 456 789" />
          </Field>
          {state?.error ? <p className="text-sm text-tone-red">{state.error}</p> : null}
          <Button type="submit" size="lg" disabled={pending} className="mt-2">
            {pending ? <Spinner /> : null}
            {t.onboarding.submit}
          </Button>
        </form>
      </div>
    </SplitLayout>
  );
}
