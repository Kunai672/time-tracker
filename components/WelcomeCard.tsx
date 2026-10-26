"use client";

import Link from "next/link";
import { DownloadIcon, TagsIcon } from "lucide-react";

import { Button, buttonVariants } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { cn } from "../lib/utils";

export type WelcomeCardProps = {
  /** Replaces the empty dataset with the built-in sample data. */
  onLoadSample: () => void;
};

/**
 * First-run guidance shown on the dashboard while there are no entries or
 * custom categories yet.
 */
export function WelcomeCard({ onLoadSample }: WelcomeCardProps) {
  return (
    <Card data-testid="first-run-welcome">
      <CardHeader>
        <CardTitle>Welcome to Time Tracker</CardTitle>
        <CardDescription>
          Two quick steps and you are ready to track.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          <li className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
              <div>
                <p className="font-medium">Create your first category</p>
                <p className="text-xs text-muted-foreground">
                  Group your time by project or activity.
                </p>
              </div>
            </div>
            <Link
              href="/categories"
              className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
            >
              <TagsIcon data-icon="inline-start" aria-hidden />
              Create category
            </Link>
          </li>

          <li className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              <div>
                <p className="font-medium">Or explore with sample data</p>
                <p className="text-xs text-muted-foreground">
                  Adds a few categories and entries you can delete anytime.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onLoadSample}
              className="shrink-0"
            >
              <DownloadIcon data-icon="inline-start" aria-hidden />
              Load sample data
            </Button>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
