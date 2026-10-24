"use client";

import { useTheme } from "next-themes";
import { ClockIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

import { useAppData } from "../../components/AppDataProvider";
import { useSettings } from "../../components/SettingsProvider";
import { DataTransfer } from "../../components/DataTransfer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { formatTime } from "../../lib/datetime";
import type { ThemeChoice } from "../../lib/theme";
import type { TimeFormat } from "../../lib/types";

/** A fixed instant (13:05 local) so the preview is stable across renders. */
const PREVIEW_ISO = new Date(2024, 0, 1, 13, 5).toISOString();

export default function SettingsPage() {
  const { data, ready, replaceDataAction, resetAction } = useAppData();
  const { settings, setTimeFormat } = useSettings();
  const { theme, setTheme } = useTheme();

  const currentTheme: ThemeChoice =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";
  const hour12 = settings.timeFormat === "12h";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Preferences and your local data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Follow your system or pick a theme explicitly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={currentTheme}
            onValueChange={(value) => {
              if (value) setTheme(String(value));
            }}
          >
            <TabsList aria-label="Theme">
              <TabsTrigger value="light">
                <SunIcon aria-hidden />
                Light
              </TabsTrigger>
              <TabsTrigger value="dark">
                <MoonIcon aria-hidden />
                Dark
              </TabsTrigger>
              <TabsTrigger value="system">
                <MonitorIcon aria-hidden />
                System
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time format</CardTitle>
          <CardDescription>
            Example:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatTime(PREVIEW_ISO, hour12)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={settings.timeFormat}
            onValueChange={(value) => {
              if (value === "12h" || value === "24h") {
                setTimeFormat(value as TimeFormat);
              }
            }}
          >
            <TabsList aria-label="Time format">
              <TabsTrigger value="24h">
                <ClockIcon aria-hidden />
                24-hour
              </TabsTrigger>
              <TabsTrigger value="12h">
                <ClockIcon aria-hidden />
                12-hour
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {!ready ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <DataTransfer
          data={data}
          onImport={replaceDataAction}
          onReset={resetAction}
        />
      )}
    </div>
  );
}
