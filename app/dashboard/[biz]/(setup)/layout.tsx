import { SetupNav } from "@/components/dashboard/setup-nav";

/** Setup pages share a sub-menu, so switching between them is one click. */
export default async function SetupLayout({ children, params }: LayoutProps<"/dashboard/[biz]">) {
  const { biz } = await params;
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
      <SetupNav slug={biz} />
      <div className="grid min-w-0 gap-5">{children}</div>
    </div>
  );
}
