import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
import { requirePlatformAdmin } from "@/lib/admin/access";
import {
  revokeUserSessionsAction,
  sendPasswordResetAction,
  setPlatformAdminAction,
  setUserBannedAction,
  verifyUserEmailAction,
} from "@/lib/admin/actions";
import { listUsersAdmin } from "@/lib/admin/queries";
import { fmtDate } from "@/lib/format";
import { getSiteCopy } from "@/lib/site-locale";
import { SearchForm, td, th } from "../search";
import { ActButton, ReasonButton } from "../ui";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getSiteCopy();
  return { title: t.admin.nav.users };
}

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  const q = (await searchParams).q;
  const query = Array.isArray(q) ? q[0] : q;
  const [{ user: me }, { t, locale }, rows] = await Promise.all([requirePlatformAdmin(), getSiteCopy(), listUsersAdmin({ q: query })]);
  const a = t.admin;
  const u = a.users;
  return (
    <>
      <PageHeader title={a.nav.users} />
      <SearchForm q={query} placeholder={a.common.searchPlaceholder} label={a.common.search} />
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="border-b">
            <tr>
              <th className={th}>{t.dash.common.name}</th>
              <th className={th}>{u.clinics}</th>
              <th className={th}>{a.common.status}</th>
              <th className={th}>{a.common.created}</th>
              <th className={th}>{a.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className={td}>
                  <span className="font-medium">{r.name}</span>
                  <span className="block text-xs text-muted-foreground">{r.email}</span>
                </td>
                <td className={`${td} tabular-nums`}>{r.clinics}</td>
                <td className={td}>
                  <span className="flex flex-wrap gap-1">
                    <Badge variant={r.emailVerified ? "outline" : "muted"}>
                      {u.verified}: {r.emailVerified ? a.common.yes : a.common.no}
                    </Badge>
                    {r.twoFactorEnabled ? <Badge variant="outline">{u.twoFactor}</Badge> : null}
                    {r.role === "admin" ? <Badge>{u.platformAdmin}</Badge> : null}
                    {r.banned ? <Badge variant="muted">{u.banned}</Badge> : null}
                  </span>
                </td>
                <td className={td}>{fmtDate(r.createdAt, "Asia/Yangon", { day: "numeric", month: "short", year: "numeric" }, locale)}</td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1.5">
                    {!r.emailVerified ? <ActButton action={verifyUserEmailAction.bind(null, r.id)}>{u.verifyEmail}</ActButton> : null}
                    <ActButton action={sendPasswordResetAction.bind(null, r.id)}>{u.sendReset}</ActButton>
                    <ActButton action={revokeUserSessionsAction.bind(null, r.id)}>{u.revokeSessions}</ActButton>
                    {r.id !== me.id ? (
                      <>
                        {r.banned ? (
                          <ActButton action={setUserBannedAction.bind(null, r.id, false, "")}>{u.unban}</ActButton>
                        ) : (
                          <ReasonButton action={setUserBannedAction.bind(null, r.id, true)} danger>
                            {u.ban}
                          </ReasonButton>
                        )}
                        <ReasonButton action={setPlatformAdminAction.bind(null, r.id, r.role !== "admin")}>
                          {r.role === "admin" ? u.removeAdmin : u.makeAdmin}
                        </ReasonButton>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length ? null : <p className="p-6 text-center text-sm text-muted-foreground">{a.common.none}</p>}
      </div>
    </>
  );
}
