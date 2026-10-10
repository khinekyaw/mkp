"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { audit, userActor } from "@/lib/audit";
import { requireUser } from "@/lib/business/access";
import { db, schema } from "@/lib/db";
import { findInvite } from "./invite";

export async function acceptInviteAction(token: string) {
  const user = await requireUser();
  const found = await findInvite(token);
  // The invite is for one address: a different signed-in account can't claim it.
  if (!found || found.invite.email.toLowerCase() !== user.email.toLowerCase()) redirect(`/invite/${token}`);

  await db.transaction(async (tx) => {
    await tx
      .insert(schema.membership)
      .values({ businessId: found.business.id, userId: user.id, role: found.invite.role })
      .onConflictDoNothing();
    await tx.update(schema.invitation).set({ acceptedAt: new Date() }).where(eq(schema.invitation.id, found.invite.id));
  });
  await audit({
    businessId: found.business.id,
    actor: userActor(user),
    action: "team.joined",
    target: { type: "user", id: user.id },
    data: { role: found.invite.role },
  });
  redirect(`/dashboard/${found.business.slug}`);
}
