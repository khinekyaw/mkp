import { redirect } from "next/navigation";
import { listMemberships, requireUser } from "@/lib/business/access";

/** Sends people to their (first) business, or to onboarding if they have none. */
export default async function DashboardIndex() {
  const user = await requireUser();
  const [first] = await listMemberships(user.id);
  redirect(first ? `/dashboard/${first.business.slug}` : "/onboarding");
}
