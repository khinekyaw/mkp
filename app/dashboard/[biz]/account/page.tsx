import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { getSiteCopy } from "@/lib/site-locale";
import { DeleteAccount, EmailForm, NameForm, PasswordForm, SignOutOthers, TwoFactorSettings } from "@/components/account/forms";

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
    <>
      <PageHeader title={a.title} description={a.description} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{a.profile}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <NameForm name={user.name} />
            <EmailForm email={user.email} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{a.password}</CardTitle>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{a.twoFactor}</CardTitle>
            <CardDescription>{user.twoFactorEnabled ? a.twoFactorOn : a.twoFactorOff}</CardDescription>
          </CardHeader>
          <CardContent>
            <TwoFactorSettings enabled={!!user.twoFactorEnabled} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{a.devices}</CardTitle>
            <CardDescription>{a.devicesBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <SignOutOthers />
          </CardContent>
        </Card>
        <Card className="border-tone-red/30">
          <CardHeader>
            <CardTitle>{a.deleteTitle}</CardTitle>
            <CardDescription>{a.deleteBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteAccount />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
