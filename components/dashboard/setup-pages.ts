import { Clock, History, Palette, Settings, Share2, Tag, UserRound, Users } from "lucide-react";

/** The setup section's pages, in sub-menu order. Keys index `t.dash.nav`. */
export const SETUP_PAGES = [
  { href: "/services", key: "services", icon: Tag },
  { href: "/staff", key: "staff", icon: UserRound },
  { href: "/hours", key: "hours", icon: Clock },
  { href: "/appearance", key: "appearance", icon: Palette },
  { href: "/share", key: "share", icon: Share2 },
  { href: "/team", key: "team", icon: Users },
  { href: "/settings", key: "settings", icon: Settings },
  { href: "/activity", key: "activity", icon: History },
] as const;

/** localStorage key remembering the last setup page opened, per business. */
export const lastSetupKey = (slug: string) => `setup-last:${slug}`;
