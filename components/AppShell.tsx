"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  TimerIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";
import { StorageErrorBanner } from "./StorageErrorBanner";
import { ThemeToggle } from "./ThemeToggle";
import { RunningTimerIndicator } from "./RunningTimerIndicator";
import { useAppData } from "./AppDataProvider";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 font-heading font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        collapsed && "justify-center px-0",
      )}
      aria-label="Time Tracker home"
    >
      <TimerIcon className="size-5 text-primary" aria-hidden />
      {!collapsed && <span>Time Tracker</span>}
    </Link>
  );
}

/**
 * Responsive application chrome: a collapsible sidebar on desktop, a bottom
 * tab bar below `md`, and a sticky top bar with the theme menu and the live
 * running-timer indicator.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { storageStatus, resetAction } = useAppData();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border bg-sidebar md:flex md:flex-col md:sticky md:top-0 md:h-dvh",
          collapsed ? "md:w-16" : "md:w-60",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-border",
            collapsed ? "justify-center px-2" : "justify-between px-3",
          )}
        >
          <Brand collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            className={cn(collapsed && "hidden")}
          >
            <PanelLeftCloseIcon aria-hidden />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {collapsed && (
          <div className="flex justify-center border-t border-border p-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
            >
              <PanelLeftOpenIcon aria-hidden />
            </Button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="md:hidden">
            <Brand />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <RunningTimerIndicator />
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-10">
          <StorageErrorBanner status={storageStatus} onReset={resetAction} />
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Primary"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:outline-none",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
