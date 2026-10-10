import type { Metadata } from "next";
import { DeleteAccountRow, DevicesRow, EmailRow, NameRow, PasswordRow, TwoFactorRow } from "@/components/account/forms";
import { PageHeader } from "@/components/ui/page";
import { SettingsSection, SettingsStack } from "@/components/ui/settings";
import { requireBusiness } from "@/lib/business/access";
import { getSiteCopy } from "@/lib/site-locale";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.account };
}

/** The signed-in person's own settings; shown inside whichever clinic they're in. */
export default async function AccountPage({ params }: PageProps<"/dashboard/[biz]/account">) {
  const { biz } = await params;
  const [{ user }, { t }] = await Promise.all([requireBusiness(biz), getSiteCopy()]);
  const a = t.dash.account;
  return (
    <SettingsStack className="mx-auto">
      <PageHeader title={a.title} description={a.description} />
      <SettingsSection title={a.profile}>
        <NameRow name={user.name} />
        <EmailRow email={user.email} />
      </SettingsSection>
      <SettingsSection title={a.security} description={a.securityBody}>
        <PasswordRow />
        <TwoFactorRow enabled={!!user.twoFactorEnabled} />
        <DevicesRow />
      </SettingsSection>
      <SettingsSection title={a.dangerZone} danger>
        <DeleteAccountRow />
      </SettingsSection>
    </SettingsStack>
  );
}
