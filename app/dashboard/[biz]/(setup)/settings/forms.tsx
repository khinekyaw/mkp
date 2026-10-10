"use client";

import { useActionState } from "react";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
import { SettingsFooter, SettingsRow, SettingsSection } from "@/components/ui/settings";
import { Switch } from "@/components/ui/switch";
import { TimezoneSelect } from "@/components/ui/timezone-select";
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

/** Controls in the right-hand column of a row share one width so the column lines up. */
const control = "w-full sm:w-72";

export function ProfileSettings({ slug, values, bookingBase }: { slug: string; values: Profile; bookingBase: string }) {
  const [state, action, pending] = useActionState(saveProfileAction.bind(null, slug), null);
  useActionFeedback(state);
  const err = (k: string) => state?.fields?.[k]?.[0];
  const { t } = useSiteCopy();
  const se = t.dash.settings;
  const verticals = t.onboarding.verticals;
  return (
    <form action={action}>
      <SettingsSection title={se.details} description={se.detailsBody}>
        <SettingsRow label={se.businessName} htmlFor="b-name" error={err("name")} required>
          <Input id="b-name" name="name" defaultValue={values.name} required className={control} />
        </SettingsRow>
        <SettingsRow label={se.bookingLink} htmlFor="b-slug" description={se.bookingLinkHint} error={err("slug")} required>
          <div className={`flex items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring/15 ${control}`}>
            <span className="max-w-[55%] truncate pl-3 text-sm text-muted-foreground" title={bookingBase}>
              {bookingBase.replace(/^https?:\/\//, "")}
            </span>
            <input id="b-slug" name="slug" defaultValue={values.slug} required className="h-10 min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none" />
          </div>
        </SettingsRow>
        <SettingsRow label={se.type} htmlFor="b-vertical">
          <Select id="b-vertical" name="vertical" defaultValue={values.vertical} className={control}>
            {(Object.keys(verticals) as (keyof typeof verticals)[]).map((v) => (
              <option key={v} value={v}>
                {verticals[v]}
              </option>
            ))}
          </Select>
        </SettingsRow>
        <SettingsRow label={se.timezone} htmlFor="b-tz" description={se.timezoneHint} error={err("timezone")}>
          <TimezoneSelect id="b-tz" name="timezone" defaultValue={values.timezone} className={control} />
        </SettingsRow>
        <SettingsRow label={t.dash.common.phone} htmlFor="b-phone">
          <Input id="b-phone" name="phone" type="tel" defaultValue={values.phone} className={control} />
        </SettingsRow>
        <SettingsRow label={se.notificationEmail} htmlFor="b-email" description={se.notificationEmailHint} error={err("email")}>
          <Input id="b-email" name="email" type="email" defaultValue={values.email} className={control} />
        </SettingsRow>
        <SettingsRow label={se.address} htmlFor="b-address">
          <Input id="b-address" name="address" defaultValue={values.address} className={control} />
        </SettingsRow>
        <SettingsRow label={se.website} htmlFor="b-website" error={err("website")}>
          <Input id="b-website" name="website" defaultValue={values.website} placeholder="yourclinic.com" className={control} />
        </SettingsRow>
        <SettingsFooter hint={state?.error && !state.fields ? <span className="text-red-600">{state.error}</span> : null}>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null} {se.saveDetails}
          </Button>
        </SettingsFooter>
      </SettingsSection>
    </form>
  );
}

export function RulesSettings({ slug, settings }: { slug: string; settings: BusinessSettings }) {
  const [state, action, pending] = useActionState(saveBookingRulesAction.bind(null, slug), null);
  useActionFeedback(state);
  const { t } = useSiteCopy();
  const se = t.dash.settings;
  return (
    <form action={action}>
      <SettingsSection title={se.rules} description={se.rulesBody}>
        <SettingsRow label={se.minNotice} htmlFor="r-lead" description={se.minNoticeHint}>
          <Select id="r-lead" name="leadMinutes" defaultValue={String(settings.leadMinutes)} className={control}>
            {[0, 30, 60, 120, 240, 720, 1440, 2880].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? se.none : m < 60 ? se.minutes(m) : m < 1440 ? se.hoursN(m / 60) : se.days(m / 1440)}
              </option>
            ))}
          </Select>
        </SettingsRow>
        <SettingsRow label={se.bookUpTo} htmlFor="r-horizon" description={se.bookUpToHint}>
          <Select id="r-horizon" name="horizonDays" defaultValue={String(settings.horizonDays)} className={control}>
            {[7, 14, 30, 60, 90, 180].map((d) => (
              <option key={d} value={d}>
                {se.daysAhead(d)}
              </option>
            ))}
          </Select>
        </SettingsRow>
        <SettingsRow label={se.startEvery} htmlFor="r-interval" description={se.startEveryHint}>
          <Select id="r-interval" name="slotIntervalMin" defaultValue={String(settings.slotIntervalMin)} className={control}>
            {[10, 15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {se.minutes(m)}
              </option>
            ))}
          </Select>
        </SettingsRow>
        <SettingsRow label={se.cancelUntil} htmlFor="r-cancel" description={se.cancelUntilHint}>
          <Select id="r-cancel" name="cancelNoticeHours" defaultValue={String(settings.cancelNoticeHours)} className={control}>
            {[0, 2, 6, 12, 24, 48].map((h) => (
              <option key={h} value={h}>
                {h === 0 ? se.startTime : se.hoursBefore(h)}
              </option>
            ))}
          </Select>
        </SettingsRow>
        <SettingsRow label={se.confirmManually} htmlFor="r-confirm" description={se.confirmManuallyHint} inline>
          <Switch id="r-confirm" name="requireConfirmation" defaultChecked={settings.requireConfirmation} />
        </SettingsRow>
        <SettingsRow label={se.chooseDoctor} htmlFor="r-choose" description={se.chooseDoctorHint} inline>
          <Switch id="r-choose" name="allowProviderChoice" defaultChecked={settings.allowProviderChoice} />
        </SettingsRow>
        <SettingsRow label={se.widgetLanguages} description={se.widgetLanguagesHint}>
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
        </SettingsRow>
        <SettingsRow label={se.defaultLanguage} htmlFor="r-default-locale" description={se.defaultLanguageHint}>
          <Select id="r-default-locale" name="defaultLocale" defaultValue={settings.locales[0]} className={control}>
            <option value="en">{t.dash.common.english}</option>
            <option value="my">{t.dash.common.burmese}</option>
          </Select>
        </SettingsRow>
        <SettingsFooter hint={state?.error ? <span className="text-red-600">{state.error}</span> : se.rulesApplyHint}>
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null} {se.saveRules}
          </Button>
        </SettingsFooter>
      </SettingsSection>
    </form>
  );
}
