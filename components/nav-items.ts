import {
  ClockIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  TagsIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboardIcon;
};

/** Primary destinations, shared by the desktop sidebar and mobile tab bar. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/entries", label: "Entries", icon: ClockIcon },
  { href: "/categories", label: "Categories", icon: TagsIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
] as const;
