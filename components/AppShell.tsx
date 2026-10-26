"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TimerIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActivePath, pageTitle } from "./nav-items";
import { StorageErrorBanner } from "./StorageErrorBanner";
import { DataErrorBanner } from "./DataErrorBanner";
import { ThemeToggle } from "./ThemeToggle";
import { RunningTimerIndicator } from "./RunningTimerIndicator";
import { AccountMenu } from "./AccountMenu";
import { useAppData } from "./AppDataProvider";
import { DocumentTitle } from "./DocumentTitle";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { LocalDataMigration } from "./LocalDataMigration";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

function Brand() {
  return (
    <Link
      href="/"
      aria-label="Time Tracker home"
      className="flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg px-2 font-heading font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:justify-start"
    >
      <TimerIcon className="size-5 shrink-0 text-primary" aria-hidden />
      <span className="hidden lg:inline">Time Tracker</span>
    </Link>
  );
}

/**
 * Responsive application chrome:
 * - a sticky icon rail from 768px (with tooltips) that widens to the full
 *   sidebar at 1024px,
 * - a sticky top bar holding the current page title on the left and the
 *   live running-timer indicator plus theme toggle on the right,
 * - a mobile bottom tab bar below 768px, padded for the safe area.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { storageStatus, resetAction, error, refetchAll } = useAppData();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <DocumentTitle />
      <KeyboardShortcuts />
      <LocalDataMigration />

      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-sidebar md:flex md:w-16 lg:w-60">
        <div className="flex h-14 shrink-0 items-center border-b border-border px-2 lg:px-3">
          <Brand />
        </div>

        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-2"
          aria-label="Primary"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger
                  render={
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={item.label}
                      className={cn(
                        "flex min-h-10 items-center justify-center gap-3 rounded-lg px-0 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:justify-start lg:px-3",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    />
                  }
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  <span className="hidden lg:inline">{item.label}</span>
                </TooltipTrigger>
                <TooltipContent side="right" className="lg:hidden">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <span className="truncate font-heading text-base font-semibold tracking-tight">
            {pageTitle(pathname)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <RunningTimerIndicator />
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-6 md:pb-10">
          <StorageErrorBanner status={storageStatus} onReset={resetAction} />
          <DataErrorBanner error={error} onRetry={refetchAll} />
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Primary"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
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
