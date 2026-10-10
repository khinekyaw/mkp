import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page";
import { savePlatformSettingsAction } from "@/lib/admin/actions";
import { getPlatformSettings } from "@/lib/platform";
import { getSiteCopy } from "@/lib/site-locale";
import { ActionForm, SubmitButton } from "../ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.admin.nav.settings };
}

export default async function AdminSettings() {
  const [{ t }, settings] = await Promise.all([getSiteCopy(), getPlatformSettings()]);
  const s = t.admin.settings;
  return (
    <>
      <PageHeader title={t.admin.nav.settings} />
      <ActionForm action={savePlatformSettingsAction} className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{s.announcement}</CardTitle>
            <CardDescription>{s.announcementHelp}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Field label={s.announcementEn} htmlFor="ann-en">
              <Input id="ann-en" name="announcementEn" defaultValue={settings.announcement.en} maxLength={300} />
            </Field>
            <Field label={s.announcementMy} htmlFor="ann-my">
              <Input id="ann-my" name="announcementMy" defaultValue={settings.announcement.my} maxLength={300} />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{s.maintenance}</CardTitle>
            <CardDescription>{s.maintenanceHelp}</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="maintenance" defaultChecked={settings.maintenance} /> {s.maintenance}
            </label>
          </CardContent>
        </Card>
        <SubmitButton className="w-fit">{t.admin.common.save}</SubmitButton>
      </ActionForm>
    </>
  );
}
