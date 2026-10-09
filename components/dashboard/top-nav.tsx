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
import { LanguageSwitch, useSiteCopy } from "@/components/i18n/site-locale";
import { signOut } from "@/lib/auth-client";
import type { MemberRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

type Biz = { slug: string; name: string };

const NAV = [
  { href: "", key: "overview" },
  { href: "/calendar", key: "calendar" },
  { href: "/appointments", key: "appointments" },
  { href: "/customers", key: "customers" },
] as const;
const SETUP = [
  { href: "/services", key: "services", icon: Tag },
  { href: "/staff", key: "staff", icon: UserRound },
  { href: "/hours", key: "hours", icon: Clock },
  { href: "/appearance", key: "appearance", icon: Palette },
  { href: "/share", key: "share", icon: Share2 },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

// Same weight active or not: a bolder active tab would widen and shift the centered bar.
const tab = "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
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
  const { t } = useSiteCopy();
  const nav = t.dash.nav;
  const base = `/dashboard/${business.slug}`;
  const isActive = (href: string) => (href === "" ? pathname === base : pathname.startsWith(base + href));
  const setupActive = SETUP.find((s) => isActive(s.href));

  const tabs = (
    <nav aria-label={nav.dashboard} className="flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-full bg-muted p-1 scrollbar-none">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={base + item.href}
            aria-current={active ? "page" : undefined}
            className={cn(tab, active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {nav[item.key]}
          </Link>
        );
      })}
      {role !== "staff" ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(tab, setupActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {/* Always "Setup" so the bar keeps its width; the menu marks the current page. */}
            {nav.setup}
            <ChevronDown className="size-3.5 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {SETUP.map((s) => (
              <DropdownMenuItem key={s.href} onSelect={() => router.push(base + s.href)}>
                <s.icon /> <span className="flex-1">{nav[s.key]}</span>
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
            aria-label={nav.overview}
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
              <DropdownMenuLabel>{nav.businesses}</DropdownMenuLabel>
              {businesses.map((b) => (
                <DropdownMenuItem key={b.slug} onSelect={() => router.push(`/dashboard/${b.slug}`)}>
                  <span className="flex-1 truncate">{b.name}</span>
                  {b.slug === business.slug ? <Check /> : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push("/onboarding")}>
                <Plus /> {nav.newBusiness}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
  
          {/* Account sits beside the switcher on phones; on desktop it's on the right. */}
          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <LanguageSwitch />
            <AccountMenu user={user} role={role} slug={business.slug} />
          </div>
        </div>
  
        {tabs}
  
        <div className="hidden items-center justify-end gap-2 lg:flex">
          <LanguageSwitch />
          <a href={`/b/${business.slug}`} target="_blank" rel="noreferrer" aria-label={nav.viewBookingPage} title={nav.viewBookingPage} className={roundButton}>
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
  const { t } = useSiteCopy();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.dash.nav.account}
        className="flex h-10 cursor-pointer items-center rounded-full bg-muted p-1 outline-none hover:bg-border focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Avatar name={user.name} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="grid">
          <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
          <span className="truncate">{user.email}</span>
          <span>{t.dash.roles[role]}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => window.open(`/b/${slug}`, "_blank", "noreferrer")} className="lg:hidden">
          <ExternalLink /> {t.dash.nav.viewBookingPage}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            router.replace("/sign-in");
            router.refresh();
          }}
        >
          <LogOut /> {t.dash.nav.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
