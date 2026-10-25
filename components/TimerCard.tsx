"use client";

import { useState } from "react";
import { PlayIcon, SquareIcon } from "lucide-react";

import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { formatTime } from "../lib/datetime";
import { formatClock } from "../lib/duration";
import { elapsedSeconds } from "../lib/timer";
import type { Category, RunningTimer } from "../lib/types";
import { useAppData } from "./AppDataProvider";
import { useSettings } from "./SettingsProvider";
import { useNowSeconds } from "./useNow";

export type TimerCardViewProps = {
  categories: Category[];
  runningTimer: RunningTimer | null;
  /** Injected clock so the running state is deterministic in tests. */
  now: Date;
  categoryId: string;
  description: string;
  onCategoryChange: (id: string) => void;
  onDescriptionChange: (value: string) => void;
  onStart: () => void;
  onStop: () => void;
  /** Wall-clock time the current timer began, e.g. "Started at 9:00 AM". */
  startedAtLabel?: string;
};

/** A small pulsing dot that signals an active timer. */
export function PulseDot() {
  return (
    <span className="relative flex size-3" aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
      <span className="relative inline-flex size-3 rounded-full bg-primary" />
    </span>
  );
}

function CategoryOptions({ categories }: { categories: Category[] }) {
  return (
    <>
      {categories.map((category) => (
        <SelectItem key={category.id} value={category.id}>
          <span
            className="inline-block size-3 shrink-0 rounded-full"
            style={{ backgroundColor: category.color }}
            aria-hidden
          />
          {category.name}
        </SelectItem>
      ))}
    </>
  );
}

export function TimerCardView({
  categories,
  runningTimer,
  now,
  categoryId,
  description,
  onCategoryChange,
  onDescriptionChange,
  onStart,
  onStop,
  startedAtLabel,
}: TimerCardViewProps) {
  const runningCategory = runningTimer
    ? categories.find((category) => category.id === runningTimer.categoryId)
    : undefined;

  return (
    <Card
      data-testid="timer-card"
      className={runningTimer ? "ring-1 ring-primary/20" : undefined}
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          {runningTimer && <PulseDot />}
          <div>
            <CardTitle>
              {runningTimer ? "Timer running" : "Start a timer"}
            </CardTitle>
            <CardDescription>
              {runningTimer
                ? runningCategory?.name ?? "Uncategorized"
                : "Pick a category and track time as it happens."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {runningTimer && (
          <div className="space-y-1">
            <p
              data-testid="timer-clock"
              className="text-display font-semibold tabular-nums tracking-tight sm:text-display-lg"
              aria-live="polite"
            >
              {formatClock(elapsedSeconds(runningTimer, now))}
            </p>
            {startedAtLabel && (
              <p className="text-sm text-muted-foreground">
                {startedAtLabel}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label
            htmlFor="timer-description"
            className="flex flex-col gap-1.5"
          >
            <span className="text-xs font-medium text-muted-foreground">
              Description
            </span>
            <Input
              id="timer-description"
              name="timer-description"
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="What are you working on?"
              maxLength={140}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span
              id="timer-category-label"
              className="text-xs font-medium text-muted-foreground"
            >
              Category
            </span>
            <Select
              value={categoryId}
              onValueChange={(value) => onCategoryChange(String(value))}
              disabled={Boolean(runningTimer)}
            >
              <SelectTrigger
                aria-labelledby="timer-category-label"
                className="w-full"
              >
                <SelectValue>
                  {(value) =>
                    categories.find((category) => category.id === value)?.name ??
                    "Select a category"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <CategoryOptions categories={categories} />
              </SelectContent>
            </Select>
          </div>
        </div>

        {runningTimer ? (
          <Button
            type="button"
            size="lg"
            variant="destructive"
            onClick={onStop}
            className="w-full sm:w-auto"
          >
            <SquareIcon data-icon="inline-start" aria-hidden />
            Stop timer
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            onClick={onStart}
            disabled={!categoryId}
            className="w-full sm:w-auto"
          >
            <PlayIcon data-icon="inline-start" aria-hidden />
            Start timer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Live timer card wired to the app store. */
export function TimerCard() {
  const { data, startTimerAction, stopTimerAction } = useAppData();
  const { settings } = useSettings();
  const running = data.runningTimer;
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");

  const seconds = useNowSeconds(Boolean(running));
  const selected = categoryId || data.categories[0]?.id || "";
  // While running, show the category the timer actually belongs to.
  const displayedCategory = running ? running.categoryId : selected;
  const now = seconds !== null ? new Date(seconds * 1000) : new Date(0);

  function handleStart() {
    if (!selected) return;
    startTimerAction(selected);
  }

  function handleStop() {
    stopTimerAction(description);
    setDescription("");
  }

  return (
    <TimerCardView
      categories={data.categories}
      runningTimer={running}
      now={now}
      categoryId={displayedCategory}
      description={description}
      onCategoryChange={setCategoryId}
      onDescriptionChange={setDescription}
      onStart={handleStart}
      onStop={handleStop}
      startedAtLabel={
        running
          ? `Started at ${formatTime(running.startedAt, settings.timeFormat === "12h")}`
          : undefined
      }
    />
  );
}
