"use client";

import {
  Check,
  ChevronDown,
  Clock,
  Cross,
  ExternalLink,
  Grip,
  LogOut,
  Palette,
  Plus,
  Settings,
  Share2,
  Tag,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { floatingBar } from "@/components/brand/styles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import type { MemberRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

type Biz = { slug: string; name: string };

const NAV = [
  { href: "", label: "Overview" },
  { href: "/calendar", label: "Calendar" },
  { href: "/appointments", label: "Appointments" },
  { href: "/customers", label: "Customers" },
];
const SETUP = [
  { href: "/services", label: "Services", icon: Tag },
  { href: "/staff", label: "Staff", icon: UserRound },
  { href: "/hours", label: "Hours & closures", icon: Clock },
  { href: "/appearance", label: "Appearance", icon: Palette },
  { href: "/share", label: "Share & embed", icon: Share2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

const tab = "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const roundButton =
  "grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-border outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&_svg]:size-4";

/** Dashboard header: logo and business switcher, pill tabs, and account. */
export function TopNav({
  business,
  businesses,
  user,
  role,
}: {
  business: Biz;
  businesses: Biz[];
  user: { name: string; email: string };
  role: MemberRole;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/dashboard/${business.slug}`;
  const isActive = (href: string) => (href === "" ? pathname === base : pathname.startsWith(base + href));
  const setupActive = SETUP.find((s) => isActive(s.href));

  const tabs = (
    <nav aria-label="Dashboard" className="flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-full bg-muted p-1 scrollbar-none">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={base + item.href}
            aria-current={active ? "page" : undefined}
            className={cn(tab, active ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {item.label}
          </Link>
        );
      })}
      {role !== "staff" ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(tab, setupActive ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {setupActive?.label ?? "Setup"}
            <ChevronDown className="size-3.5 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {SETUP.map((s) => (
              <DropdownMenuItem key={s.href} onSelect={() => router.push(base + s.href)}>
                <s.icon /> <span className="flex-1">{s.label}</span>
                {setupActive?.href === s.href ? <Check /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </nav>
  );

  return (
    // Floats over the page: sticky, frosted, lifted with a soft shadow.
    <div className="sticky top-0 z-40 px-3 pt-3 sm:px-6 lg:px-8">
      <header className={cn("mx-auto grid w-full max-w-7xl gap-2 rounded-[1.75rem] p-2 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:rounded-full", floatingBar)}>
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={base}
            aria-label="Overview"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Cross className="size-5 fill-current" strokeWidth={1.5} />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-10 min-w-0 cursor-pointer items-center gap-2 rounded-full bg-ink-pill pr-3.5 pl-3.5 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <Grip className="size-4 shrink-0 opacity-80" />
              <span className="truncate">{business.name}</span>
              <ChevronDown className="size-3.5 shrink-0 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Businesses</DropdownMenuLabel>
              {businesses.map((b) => (
                <DropdownMenuItem key={b.slug} onSelect={() => router.push(`/dashboard/${b.slug}`)}>
                  <span className="flex-1 truncate">{b.name}</span>
                  {b.slug === business.slug ? <Check /> : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push("/onboarding")}>
                <Plus /> New business
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
  
          {/* Account sits beside the switcher on phones; on desktop it's on the right. */}
          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <AccountMenu user={user} role={role} slug={business.slug} />
          </div>
        </div>
  
        {tabs}
  
        <div className="hidden items-center justify-end gap-2 lg:flex">
          <a href={`/b/${business.slug}`} target="_blank" rel="noreferrer" aria-label="View booking page" title="View booking page" className={roundButton}>
            <ExternalLink />
          </a>
          <AccountMenu user={user} role={role} slug={business.slug} />
        </div>
      </header>
    </div>
  );
}

function AccountMenu({ user, role, slug }: { user: { name: string; email: string }; role: MemberRole; slug: string }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account"
        className="flex h-10 cursor-pointer items-center rounded-full bg-muted p-1 outline-none hover:bg-border focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Avatar name={user.name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="grid">
          <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
          <span className="truncate">{user.email}</span>
          <span className="capitalize">{role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => window.open(`/b/${slug}`, "_blank", "noreferrer")} className="lg:hidden">
          <ExternalLink /> View booking page
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            router.replace("/sign-in");
            router.refresh();
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
