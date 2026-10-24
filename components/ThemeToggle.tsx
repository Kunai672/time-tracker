"use client";

import { useTheme } from "next-themes";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { THEME_CHOICES, type ThemeChoice } from "@/lib/theme";

const LABELS: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

const ICONS: Record<ThemeChoice, typeof SunIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
};

/**
 * Theme menu. The visible icon swaps with the active theme via the `dark:`
 * variant, while `next-themes` owns toggling the `dark` class on `<html>`.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const current: ThemeChoice =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            title="Toggle theme"
          />
        }
      >
        <SunIcon className="hidden dark:block" aria-hidden />
        <MoonIcon className="block dark:hidden" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) => setTheme(value as ThemeChoice)}
        >
          {THEME_CHOICES.map((choice) => {
            const Icon = ICONS[choice];
            return (
              <DropdownMenuRadioItem key={choice} value={choice}>
                <Icon aria-hidden />
                {LABELS[choice]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
