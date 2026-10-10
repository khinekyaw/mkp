import "server-only";
import { notFound, redirect } from "next/navigation";
import { getSession } from "../business/access";

/**
 * Gate for /admin. Anyone who isn't a platform admin gets a 404 (the area isn't
 * advertised). Support sessions (impersonation) never reach it.
 */
export async function requirePlatformAdmin() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/admin");
  if (session.user.role !== "admin" || session.session.impersonatedBy) notFound();
  return {
    user: session.user,
    // Production admins must have 2FA before they can see or change anything.
    needs2fa: process.env.NODE_ENV === "production" && !session.user.twoFactorEnabled,
  };
}

/** For admin Server Actions: same gate, and refuses outright while 2FA is missing. */
export async function requireAdminAction() {
  const admin = await requirePlatformAdmin();
  if (admin.needs2fa) throw new Error("Two-step verification required");
  return admin.user;
}
