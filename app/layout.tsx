import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AppDataProvider } from "../components/AppDataProvider";
import { DataProvider } from "../components/DataProvider";
import { AppShell } from "../components/AppShell";
import { SettingsProvider } from "../components/SettingsProvider";
import { ThemeProvider } from "../components/theme-provider";
import { Toaster } from "../components/ui/sonner";
import { cn } from "@/lib/utils";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Time Tracker",
  description: "A client-only time tracker that stores everything in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <DataProvider>
            <SettingsProvider>
              <AppDataProvider>
                <AppShell>{children}</AppShell>
              </AppDataProvider>
            </SettingsProvider>
          </DataProvider>
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
