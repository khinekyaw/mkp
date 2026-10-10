import type { Metadata } from "next";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { List } from "@/components/ui/list";
import { PageHeader } from "@/components/ui/page";
import { requireBusiness } from "@/lib/business/access";
import { listTeam } from "@/lib/dashboard/queries";
import { fmtDate } from "@/lib/format";
import { getSiteCopy } from "@/lib/site-locale";
import { InviteForm, MemberControls, RevokeInvite } from "./controls";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.dash.meta.team };
}

export default async function TeamPage({ params }: PageProps<"/dashboard/[biz]/team">) {
  const { biz } = await params;
  const [{ business, user, role: myRole }, { t, locale }] = await Promise.all([requireBusiness(biz, "admin"), getSiteCopy()]);
  const tm = t.dash.team;
  const { members, invites } = await listTeam(business.id);

  return (
    <>
      <PageHeader title={tm.title} description={tm.description} />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="grid gap-6">
          <section className="grid gap-2">
            <h2 className="text-sm font-semibold">{tm.members}</h2>
            <List>
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-[0.875rem] px-3 py-3">
                  <Avatar name={m.name} size="lg" />
                  <span className="min-w-40 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {m.name}
                      {m.userId === user.id ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">({tm.you})</span> : null}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{m.email}</span>
                  </span>
                  <MemberControls
                    slug={business.slug}
                    membershipId={m.id}
                    name={m.name}
                    role={m.role}
                    canEditOwners={myRole === "owner"}
                  />
                </li>
              ))}
            </List>
          </section>
          {invites.length ? (
            <section className="grid gap-2">
              <h2 className="text-sm font-semibold">{tm.pending}</h2>
              <List>
                {invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-[0.875rem] px-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{i.email}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.dash.roles[i.role]} · {tm.expires(fmtDate(i.expiresAt, business.timezone, { month: "short", day: "numeric" }, locale))}
                      </span>
                    </span>
                    <RevokeInvite slug={business.slug} inviteId={i.id} />
                  </li>
                ))}
              </List>
            </section>
          ) : null}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{tm.invite}</CardTitle>
            <CardDescription>{tm.inviteBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm slug={business.slug} canInviteOwners={myRole === "owner"} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
