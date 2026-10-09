import { Toaster } from "@/components/ui/toaster";
import { TopNav } from "@/components/dashboard/top-nav";
import { listMemberships, requireBusiness } from "@/lib/business/access";

export default async function BusinessLayout({ children, params }: LayoutProps<"/dashboard/[biz]">) {
  const { biz } = await params;
  const { business, user, role } = await requireBusiness(biz);
  const memberships = await listMemberships(user.id);

  return (
    <div className="min-h-dvh bg-canvas">
      <TopNav
        business={{ slug: business.slug, name: business.name }}
        businesses={memberships.map((m) => m.business)}
        user={{ name: user.name, email: user.email }}
        role={role}
      />
      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 pt-6 pb-12 sm:px-6 lg:px-8 lg:pt-10">{children}</main>
      <Toaster />
    </div>
  );
}
