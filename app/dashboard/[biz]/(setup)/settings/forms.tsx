"use client";

import { useActionState } from "react";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { useSiteCopy } from "@/components/i18n/site-locale";
import type { BusinessSettings } from "@/lib/business/settings";
import { saveBookingRulesAction, saveProfileAction } from "@/lib/dashboard/actions/business";

type Profile = {
  name: string;
  slug: string;
  vertical: string;
  timezone: string;
  phone: string;
  email: string;
  address: string;
  website: string;
};

export function ProfileSettings({ slug, values, bookingBase }: { slug: string; values: Profile; bookingBase: string }) {
  const [state, action, pending] = useActionState(saveProfileAction.bind(null, slug), null);
  useActionFeedback(state);
  const err = (k: string) => state?.fields?.[k]?.[0];
  const { t } = useSiteCopy();
  const se = t.dash.settings;
  const verticals = t.onboarding.verticals;
  return (
    <form action={action} className="grid gap-4">
      <Field label={se.businessName} htmlFor="b-name" error={err("name")} required>
        <Input id="b-name" name="name" defaultValue={values.name} required />
      </Field>
      <Field label={se.bookingLink} htmlFor="b-slug" error={err("slug")} hint={se.bookingLinkHint} required>
        <div className="flex items-center rounded-md border focus-within:ring-2 focus-within:ring-ring/15">
          <span className="truncate pl-3 text-sm text-muted-foreground">{bookingBase.replace(/^https?:\/\//, "")}</span>
          <input id="b-slug" name="slug" defaultValue={values.slug} required className="h-10 min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none" />
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={se.type} htmlFor="b-vertical">
          <Select id="b-vertical" name="vertical" defaultValue={values.vertical}>
            {(Object.keys(verticals) as (keyof typeof verticals)[]).map((v) => (
              <option key={v} value={v}>
                {verticals[v]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={se.timezone} htmlFor="b-tz" error={err("timezone")}>
          <TimezoneSelect id="b-tz" name="timezone" defaultValue={values.timezone} />
        </Field>
        <Field label={t.dash.common.phone} htmlFor="b-phone">
          <Input id="b-phone" name="phone" type="tel" defaultValue={values.phone} />
        </Field>
        <Field label={se.notificationEmail} htmlFor="b-email" error={err("email")} hint={se.notificationEmailHint}>
          <Input id="b-email" name="email" type="email" defaultValue={values.email} />
        </Field>
      </div>
      <Field label={se.address} htmlFor="b-address">
        <Input id="b-address" name="address" defaultValue={values.address} />
      </Field>
      <Field label={se.website} htmlFor="b-website" error={err("website")}>
        <Input id="b-website" name="website" defaultValue={values.website} placeholder="yourclinic.com" />
      </Field>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Spinner /> : null} {se.saveDetails}
      </Button>
    </form>
  );
}

function ToggleRow({ name, label, description, defaultChecked }: { name: string; label: string; description: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border px-3 py-2.5">
      <span className="grid">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
      <Switch name={name} defaultChecked={defaultChecked} />
    </label>
  );
}

export function RulesSettings({ slug, settings }: { slug: string; settings: BusinessSettings }) {
  const [state, action, pending] = useActionState(saveBookingRulesAction.bind(null, slug), null);
  useActionFeedback(state);
  const { t } = useSiteCopy();
  const se = t.dash.settings;
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={se.minNotice} htmlFor="r-lead">
          <Select id="r-lead" name="leadMinutes" defaultValue={String(settings.leadMinutes)}>
            {[0, 30, 60, 120, 240, 720, 1440, 2880].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? se.none : m < 60 ? se.minutes(m) : m < 1440 ? se.hoursN(m / 60) : se.days(m / 1440)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={se.bookUpTo} htmlFor="r-horizon">
          <Select id="r-horizon" name="horizonDays" defaultValue={String(settings.horizonDays)}>
            {[7, 14, 30, 60, 90, 180].map((d) => (
              <option key={d} value={d}>
                {se.daysAhead(d)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={se.startEvery} htmlFor="r-interval">
          <Select id="r-interval" name="slotIntervalMin" defaultValue={String(settings.slotIntervalMin)}>
            {[10, 15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {se.minutes(m)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={se.cancelUntil} htmlFor="r-cancel">
          <Select id="r-cancel" name="cancelNoticeHours" defaultValue={String(settings.cancelNoticeHours)}>
            {[0, 2, 6, 12, 24, 48].map((h) => (
              <option key={h} value={h}>
                {h === 0 ? se.startTime : se.hoursBefore(h)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <ToggleRow
        name="requireConfirmation"
        label={se.confirmManually}
        description={se.confirmManuallyHint}
        defaultChecked={settings.requireConfirmation}
      />
      <ToggleRow
        name="allowProviderChoice"
        label={se.chooseDoctor}
        description={se.chooseDoctorHint}
        defaultChecked={settings.allowProviderChoice}
      />
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">{se.widgetLanguages}</legend>
        <div className="flex flex-wrap gap-4">
          {[
            ["en", t.dash.common.english],
            ["my", t.dash.common.burmese],
          ].map(([v, label]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox name="locales" value={v} defaultChecked={settings.locales.includes(v as "en" | "my")} />
              {label}
            </label>
          ))}
        </div>
        <Field label={se.defaultLanguage} htmlFor="r-default-locale">
          <Select id="r-default-locale" name="defaultLocale" defaultValue={settings.locales[0]} className="sm:w-48">
            <option value="en">{t.dash.common.english}</option>
            <option value="my">{t.dash.common.burmese}</option>
          </Select>
        </Field>
      </fieldset>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Spinner /> : null} {se.saveRules}
      </Button>
    </form>
  );
}
