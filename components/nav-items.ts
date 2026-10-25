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

/** Whether `href` is the current route (the root only matches exactly). */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Title shown in the top bar for the current route. */
export function pageTitle(pathname: string): string {
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isActivePath(pathname, item.href));
  return match?.label ?? "Time Tracker";
}
