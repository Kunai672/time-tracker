"use client";

import { useState, type FormEvent } from "react";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "../lib/datetime";
import type { ActionResult, Category, TimeEntry } from "../lib/types";
import type { TimeEntryInput } from "../lib/validation";

export type EntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  /** The entry being edited, or null to create a new one. */
  entry: TimeEntry | null;
  onSubmit: (draft: TimeEntryInput) => ActionResult;
};

type FormState = {
  description: string;
  categoryId: string;
  start: string;
  end: string;
};

function makeForm(entry: TimeEntry | null, categories: Category[]): FormState {
  if (entry) {
    return {
      description: entry.description,
      categoryId: entry.categoryId,
      start: toDatetimeLocalValue(entry.start),
      end: toDatetimeLocalValue(entry.end),
    };
  }
  const now = toDatetimeLocalValue(new Date().toISOString());
  return {
    description: "",
    categoryId: categories[0]?.id ?? "",
    start: now,
    end: now,
  };
}

/**
 * Create/edit dialog. The parent mounts it only while open, so the form state
 * initialises from `entry` without an effect.
 */
export function EntryDialog({
  open,
  onOpenChange,
  categories,
  entry,
  onSubmit,
}: EntryDialogProps) {
  const [form, setForm] = useState<FormState>(() => makeForm(entry, categories));
  const [errors, setErrors] = useState<string[]>([]);
  const isEditing = Boolean(entry);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onSubmit({
      description: form.description,
      categoryId: form.categoryId,
      start: fromDatetimeLocalValue(form.start),
      end: fromDatetimeLocalValue(form.end),
    });

    if (result.ok) {
      onOpenChange(false);
    } else {
      setErrors(result.errors);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit entry" : "Add entry"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details of this time entry."
              : "Record time you have already spent."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <label
            htmlFor="entry-description"
            className="flex flex-col gap-1.5"
          >
            <span className="text-xs font-medium text-muted-foreground">
              Description
            </span>
            <Input
              id="entry-description"
              name="description"
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="What did you work on?"
              maxLength={140}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span
              id="entry-category-label"
              className="text-xs font-medium text-muted-foreground"
            >
              Category
            </span>
            <Select
              name="categoryId"
              value={form.categoryId}
              onValueChange={(value) => update("categoryId", String(value))}
            >
              <SelectTrigger
                aria-labelledby="entry-category-label"
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
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="entry-start" className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Start
              </span>
              <Input
                id="entry-start"
                name="start"
                type="datetime-local"
                value={form.start}
                onChange={(event) => update("start", event.target.value)}
              />
            </label>
            <label htmlFor="entry-end" className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                End
              </span>
              <Input
                id="entry-end"
                name="end"
                type="datetime-local"
                value={form.end}
                onChange={(event) => update("end", event.target.value)}
              />
            </label>
          </div>

          {errors.length > 0 && (
            <ul role="alert" className="space-y-1 text-sm text-destructive">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Save changes" : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
