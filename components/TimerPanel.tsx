"use client";

import { useEffect, useState } from "react";

import { findCategory } from "../lib/categories";
import { formatDuration } from "../lib/duration";
import { elapsedMinutes } from "../lib/timer";
import type { Category, RunningTimer } from "../lib/types";
import { useAppData } from "./AppDataProvider";

type RunningTimerViewProps = {
  timer: RunningTimer;
  category: Category | undefined;
  onStop: (description: string) => void;
};

/**
 * Mounted only while a timer runs. Because it mounts on the client it may
 * initialise `now` from the real clock, and the interval callback (not the
 * effect body) performs the state updates.
 */
function RunningTimerView({ timer, category, onStop }: RunningTimerViewProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [description, setDescription] = useState("");

  useEffect(() => {
    const handle = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(handle);
  }, []);

  return (
    <section aria-labelledby="timer-heading" className="rounded border p-4">
      <h2 id="timer-heading" className="text-lg font-semibold">
        Timer running
      </h2>
      <p className="text-3xl font-mono tabular-nums">
        {formatDuration(elapsedMinutes(timer, now))}
      </p>
      <p className="text-sm text-gray-600">
        {category?.name ?? "Uncategorized"} · started{" "}
        {new Date(timer.startedAt).toLocaleTimeString()}
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-sm">
          <span>Description</span>
          <input
            name="timer-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What did you work on?"
            className="rounded border px-2 py-1"
          />
        </label>
        <button
          type="button"
          onClick={() => onStop(description)}
          className="rounded bg-red-600 px-3 py-1 text-white"
        >
          Stop timer
        </button>
      </div>
    </section>
  );
}

export function TimerPanel() {
  const { data, startTimerAction, stopTimerAction } = useAppData();
  const [categoryId, setCategoryId] = useState("");

  const running = data.runningTimer;
  if (running) {
    return (
      <RunningTimerView
        timer={running}
        category={findCategory(data.categories, running.categoryId)}
        onStop={stopTimerAction}
      />
    );
  }

  const selected = categoryId || data.categories[0]?.id || "";

  return (
    <section aria-labelledby="timer-heading" className="rounded border p-4">
      <h2 id="timer-heading" className="text-lg font-semibold">
        Start a timer
      </h2>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-sm">
          <span>Category</span>
          <select
            name="timer-category"
            value={selected}
            onChange={(event) => setCategoryId(event.target.value)}
            className="rounded border px-2 py-1"
          >
            {data.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!selected}
          onClick={() => startTimerAction(selected)}
          className="rounded bg-emerald-600 px-3 py-1 text-white disabled:opacity-40"
        >
          Start timer
        </button>
      </div>
    </section>
  );
}
