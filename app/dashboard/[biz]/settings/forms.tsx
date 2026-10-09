"use client";

import { useActionState } from "react";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
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

export function ProfileSettings({ slug, values, bookingBase }: { slug: string; values: Profile; bookingBase: string }) {
  const [state, action, pending] = useActionState(saveProfileAction.bind(null, slug), null);
  useActionFeedback(state);
  const err = (k: string) => state?.fields?.[k]?.[0];
  return (
    <form action={action} className="grid gap-4">
      <Field label="Business name" htmlFor="b-name" error={err("name")}>
        <Input id="b-name" name="name" defaultValue={values.name} required />
      </Field>
      <Field label="Booking link" htmlFor="b-slug" error={err("slug")} hint="Changing it breaks links you've already shared.">
        <div className="flex items-center rounded-md border focus-within:ring-2 focus-within:ring-ring/15">
          <span className="truncate pl-3 text-sm text-muted-foreground">{bookingBase.replace(/^https?:\/\//, "")}</span>
          <input id="b-slug" name="slug" defaultValue={values.slug} required className="h-10 min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none" />
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="b-vertical">
          <Select id="b-vertical" name="vertical" defaultValue={values.vertical}>
            <option value="clinic">Medical clinic</option>
            <option value="dental">Dental clinic</option>
            <option value="salon">Hair & beauty salon</option>
            <option value="spa">Spa & wellness</option>
            <option value="other">Something else</option>
          </Select>
        </Field>
        <Field label="Timezone" htmlFor="b-tz" error={err("timezone")}>
          <TimezoneSelect id="b-tz" name="timezone" defaultValue={values.timezone} />
        </Field>
        <Field label="Phone" htmlFor="b-phone">
          <Input id="b-phone" name="phone" type="tel" defaultValue={values.phone} />
        </Field>
        <Field label="Notification email" htmlFor="b-email" error={err("email")} hint="New bookings are sent here and to admins.">
          <Input id="b-email" name="email" type="email" defaultValue={values.email} />
        </Field>
      </div>
      <Field label="Address" htmlFor="b-address">
        <Input id="b-address" name="address" defaultValue={values.address} />
      </Field>
      <Field label="Website" htmlFor="b-website" error={err("website")}>
        <Input id="b-website" name="website" defaultValue={values.website} placeholder="yourclinic.com" />
      </Field>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Spinner /> : null} Save details
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
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Minimum notice" htmlFor="r-lead">
          <Select id="r-lead" name="leadMinutes" defaultValue={String(settings.leadMinutes)}>
            {[0, 30, 60, 120, 240, 720, 1440, 2880].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? "None" : m < 60 ? `${m} minutes` : m < 1440 ? `${m / 60} hour${m === 60 ? "" : "s"}` : `${m / 1440} day${m === 1440 ? "" : "s"}`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Book up to" htmlFor="r-horizon">
          <Select id="r-horizon" name="horizonDays" defaultValue={String(settings.horizonDays)}>
            {[7, 14, 30, 60, 90, 180].map((d) => (
              <option key={d} value={d}>
                {d} days ahead
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Start times every" htmlFor="r-interval">
          <Select id="r-interval" name="slotIntervalMin" defaultValue={String(settings.slotIntervalMin)}>
            {[10, 15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Online cancellation until" htmlFor="r-cancel">
          <Select id="r-cancel" name="cancelNoticeHours" defaultValue={String(settings.cancelNoticeHours)}>
            {[0, 2, 6, 12, 24, 48].map((h) => (
              <option key={h} value={h}>
                {h === 0 ? "Start time" : `${h} hours before`}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <ToggleRow
        name="requireConfirmation"
        label="Confirm bookings manually"
        description="New online bookings wait for your approval."
        defaultChecked={settings.requireConfirmation}
      />
      <ToggleRow
        name="allowProviderChoice"
        label="Let patients choose a doctor"
        description="Otherwise anyone available is assigned."
        defaultChecked={settings.allowProviderChoice}
      />
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Widget languages</legend>
        <div className="flex flex-wrap gap-4">
          {[
            ["en", "English"],
            ["my", "Burmese"],
          ].map(([v, label]) => (
            <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name="locales" value={v} defaultChecked={settings.locales.includes(v as "en" | "my")} className="accent-foreground" />
              {label}
            </label>
          ))}
        </div>
        <Field label="Default language" htmlFor="r-default-locale">
          <Select id="r-default-locale" name="defaultLocale" defaultValue={settings.locales[0]} className="sm:w-48">
            <option value="en">English</option>
            <option value="my">Burmese</option>
          </Select>
        </Field>
      </fieldset>
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? <Spinner /> : null} Save rules
      </Button>
    </form>
  );
}
