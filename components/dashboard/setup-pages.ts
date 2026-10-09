import { Clock, Palette, Settings, Share2, Tag, UserRound } from "lucide-react";

/** The setup section's pages, in sub-menu order. Keys index `t.dash.nav`. */
export const SETUP_PAGES = [
  { href: "/services", key: "services", icon: Tag },
  { href: "/staff", key: "staff", icon: UserRound },
  { href: "/hours", key: "hours", icon: Clock },
  { href: "/appearance", key: "appearance", icon: Palette },
  { href: "/share", key: "share", icon: Share2 },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

/** localStorage key remembering the last setup page opened, per business. */
export const lastSetupKey = (slug: string) => `setup-last:${slug}`;
