"use client";

import { useState, type FormEvent } from "react";

import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { findCategory } from "../lib/categories";
import { formatDuration } from "../lib/duration";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "../lib/datetime";
import type { ActionResult, Category, TimeEntry } from "../lib/types";
import type { TimeEntryInput } from "../lib/validation";

export type EntriesManagerProps = {
  /** Already sorted newest first by the caller. */
  entries: TimeEntry[];
  categories: Category[];
  onCreate: (draft: TimeEntryInput) => ActionResult;
  onUpdate: (id: string, draft: TimeEntryInput) => ActionResult;
  onDelete: (id: string) => void;
};

/** Default form values. Only ever called from the browser. */
function makeEmptyForm(categories: Category[]) {
  const now = toDatetimeLocalValue(new Date().toISOString());
  return {
    description: "",
    categoryId: categories[0]?.id ?? "",
    start: now,
    end: now,
  };
}

/**
 * Add/edit form plus a list of entries. Kept as the straightforward,
 * self-contained manager; the Entries page composes the richer dialog/grouped
 * views instead.
 */
export function EntriesManager({
  entries,
  categories,
  onCreate,
  onUpdate,
  onDelete,
}: EntriesManagerProps) {
  const [form, setForm] = useState(() => makeEmptyForm(categories));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  function resetForm() {
    setForm(makeEmptyForm(categories));
    setEditingId(null);
    setErrors([]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft: TimeEntryInput = {
      description: form.description,
      categoryId: form.categoryId,
      start: fromDatetimeLocalValue(form.start),
      end: fromDatetimeLocalValue(form.end),
    };

    const result = editingId ? onUpdate(editingId, draft) : onCreate(draft);

    if (result.ok) {
      resetForm();
    } else {
      setErrors(result.errors);
    }
  }

  function startEditing(entry: TimeEntry) {
    setEditingId(entry.id);
    setForm({
      description: entry.description,
      categoryId: entry.categoryId,
      start: toDatetimeLocalValue(entry.start),
      end: toDatetimeLocalValue(entry.end),
    });
    setErrors([]);
  }

  return (
    <section aria-labelledby="entries-heading" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle id="entries-heading">
            {editingId ? "Edit entry" : "Add entry"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <label
              htmlFor="entries-description"
              className="flex flex-col gap-1.5"
            >
              <span className="text-xs font-medium text-muted-foreground">
                Description
              </span>
              <Input
                id="entries-description"
                name="description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span
                id="entries-category-label"
                className="text-xs font-medium text-muted-foreground"
              >
                Category
              </span>
              <Select
                name="categoryId"
                value={form.categoryId}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    categoryId: String(value),
                  }))
                }
              >
                <SelectTrigger
                  aria-labelledby="entries-category-label"
                  className="w-full"
                >
                  <SelectValue>
                    {(value) =>
                      categories.find((category) => category.id === value)
                        ?.name ?? "Select a category"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label htmlFor="entries-start" className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Start
              </span>
              <Input
                id="entries-start"
                name="start"
                type="datetime-local"
                value={form.start}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    start: event.target.value,
                  }))
                }
              />
            </label>

            <label htmlFor="entries-end" className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                End
              </span>
              <Input
                id="entries-end"
                name="end"
                type="datetime-local"
                value={form.end}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    end: event.target.value,
                  }))
                }
              />
            </label>

            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">
                {editingId ? "Save changes" : "Add entry"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>

          {errors.length > 0 && (
            <ul role="alert" className="mt-3 space-y-1 text-sm text-destructive">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {entries.map((entry) => {
            const category = findCategory(categories, entry.categoryId);
            return (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-3 px-3 py-3 text-sm"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: category?.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {entry.description}
                </span>
                <span className="text-muted-foreground">
                  {category?.name ?? "Uncategorized"}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {new Date(entry.start).toLocaleString()}
                </span>
                <span className="tabular-nums">
                  {formatDuration(entry.durationMinutes)}
                </span>
                <span className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => startEditing(entry)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(entry.id)}
                  >
                    Delete
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
