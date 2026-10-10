import type { Metadata } from "next";
import Link from "next/link";
import { SiteLocaleProvider } from "@/components/i18n/site-locale";
import { Button, buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/business/access";
import { getSiteCopy } from "@/lib/site-locale";
import { acceptInviteAction } from "./actions";
import { findInvite } from "./invite";

export const metadata: Metadata = { title: "Team invite", robots: { index: false } };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const [found, session, { t, locale }] = await Promise.all([findInvite(token), getSession(), getSiteCopy()]);
  const inv = t.dash.invite;
  const here = `/invite/${token}`;

  let body: React.ReactNode;
  if (!found) {
    body = <p className="text-sm text-muted-foreground">{inv.invalid}</p>;
  } else {
    const intro = (
      <>
        <h1 className="text-2xl font-medium tracking-tight">{inv.title(found.business.name)}</h1>
        <p className="text-sm text-muted-foreground">{inv.body(found.inviterName ?? found.business.name, t.dash.roles[found.invite.role])}</p>
      </>
    );
    if (!session) {
      body = (
        <>
          {intro}
          <div className="flex flex-wrap gap-2">
            <Link href={`/sign-in?next=${encodeURIComponent(here)}`} className={buttonVariants()}>
              {inv.signIn}
            </Link>
            <Link href={`/sign-up?next=${encodeURIComponent(here)}`} className={buttonVariants({ variant: "outline" })}>
              {inv.signUp}
            </Link>
          </div>
        </>
      );
    } else if (session.user.email.toLowerCase() !== found.invite.email.toLowerCase()) {
      body = (
        <>
          {intro}
          <p className="text-sm">{inv.wrongAccount(found.invite.email)}</p>
        </>
      );
    } else {
      body = (
        <>
          {intro}
          <form action={acceptInviteAction.bind(null, token)}>
            <Button type="submit">{inv.accept}</Button>
          </form>
        </>
      );
    }
  }

  return (
    <SiteLocaleProvider locale={locale}>
      <main lang={locale} className="grid min-h-dvh place-items-center bg-canvas p-6">
        <div className="grid w-full max-w-md gap-4 rounded-lg border bg-background p-8">{body}</div>
      </main>
    </SiteLocaleProvider>
  );
}
