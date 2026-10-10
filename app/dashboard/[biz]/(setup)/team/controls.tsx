"use client";

import { UserPlus } from "lucide-react";
import { useActionState, useCallback, useState, useTransition } from "react";
import { useActionFeedback } from "@/components/dashboard/use-action-feedback";
import { useSiteCopy } from "@/components/i18n/site-locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import type { ActionState } from "@/lib/actions";
import { changeRoleAction, inviteMemberAction, removeMemberAction, revokeInviteAction } from "@/lib/dashboard/actions/team";
import type { MemberRole } from "@/lib/db/schema";

const ROLES: MemberRole[] = ["staff", "admin", "owner"];

function report(res: ActionState, fallback: string) {
  if (res?.ok) {
    if (res.message) toast.success(res.message);
  } else toast.error(res?.error ?? fallback);
}

/** "Invite someone" in the page header; the form opens in a dialog that closes on success. */
export function InviteDialog({ slug, canInviteOwners }: { slug: string; canInviteOwners: boolean }) {
  const { t } = useSiteCopy();
  const tm = t.dash.team;
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(inviteMemberAction.bind(null, slug), null);
  const close = useCallback(() => setOpen(false), []);
  useActionFeedback(state, close);
  const err = (k: string) => state?.fields?.[k]?.[0];
  const invitable = ROLES.filter((r) => r !== "owner" || canInviteOwners);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> {tm.invite}
        </Button>
      </DialogTrigger>
      <DialogContent title={tm.invite} description={tm.inviteBody}>
        <form action={action} className="grid gap-4">
          <Field label={tm.email} htmlFor="inv-email" error={err("email")} required>
            <Input id="inv-email" name="email" type="email" required autoComplete="off" />
          </Field>
          <Field label={tm.role} htmlFor="inv-role">
            <Select id="inv-role" name="role" defaultValue="staff">
              {invitable.map((r) => (
                <option key={r} value={r}>
                  {t.dash.roles[r]}
                </option>
              ))}
            </Select>
          </Field>
          <dl className="grid gap-1 text-xs text-muted-foreground">
            {invitable.map((r) => (
              <div key={r}>
                <dt className="inline font-medium text-foreground">{t.dash.roles[r]}:</dt> <dd className="inline">{tm.roleHelp[r]}</dd>
              </div>
            ))}
          </dl>
          {state?.error && !state.fields ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner /> : null} {tm.send}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MemberControls({
  slug,
  membershipId,
  name,
  role,
  canEditOwners,
}: {
  slug: string;
  membershipId: string;
  name: string;
  role: MemberRole;
  canEditOwners: boolean;
}) {
  const { t } = useSiteCopy();
  const [pending, start] = useTransition();
  const locked = role === "owner" && !canEditOwners;
  return (
    <span className="flex items-center gap-2">
      <Select
        aria-label={t.dash.team.role}
        value={role}
        disabled={pending || locked}
        onChange={(e) => {
          const next = e.target.value as MemberRole;
          start(async () => report(await changeRoleAction(slug, membershipId, next), t.dash.common.somethingWrong));
        }}
        className="w-32"
      >
        {ROLES.filter((r) => r !== "owner" || canEditOwners || role === "owner").map((r) => (
          <option key={r} value={r}>
            {t.dash.roles[r]}
          </option>
        ))}
      </Select>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending || locked}
        onClick={() => {
          if (!window.confirm(t.dash.team.removeConfirm(name))) return;
          start(async () => report(await removeMemberAction(slug, membershipId), t.dash.common.somethingWrong));
        }}
      >
        {pending ? <Spinner /> : t.dash.team.remove}
      </Button>
    </span>
  );
}

export function RevokeInvite({ slug, inviteId }: { slug: string; inviteId: string }) {
  const { t } = useSiteCopy();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => report(await revokeInviteAction(slug, inviteId), t.dash.common.somethingWrong))}
    >
      {pending ? <Spinner /> : t.dash.team.revoke}
    </Button>
  );
}
