"use client";

import { useState, type FormEvent } from "react";
import { CheckIcon, PencilIcon, PlusIcon, XIcon } from "lucide-react";

import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { CATEGORY_PALETTE } from "../lib/category-colors";
import {
  countEntriesForCategory,
  deleteCategoryMessage,
} from "../lib/categories";
import { UNCATEGORIZED_ID } from "../lib/constants";
import { formatDuration } from "../lib/duration";
import type { ActionResult, Category, TimeEntry } from "../lib/types";
import { cn } from "../lib/utils";

export type CategoriesManagerProps = {
  categories: Category[];
  /** Entries, so the delete dialog can report how many would be reassigned. */
  entries?: TimeEntry[];
  /** Minutes tracked this week per category id. */
  weeklyMinutes?: Record<string, number>;
  onCreate: (draft: { name: string; color: string }) => ActionResult;
  onRename: (id: string, name: string) => ActionResult;
  onRecolor: (id: string, color: string) => ActionResult;
  onDelete: (id: string) => void;
};

function swatchStyle(color: string) {
  return { backgroundColor: color };
}

export function CategoriesManager({
  categories,
  entries = [],
  weeklyMinutes = {},
  onCreate,
  onRename,
  onRecolor,
  onDelete,
}: CategoriesManagerProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CATEGORY_PALETTE[0].value);
  const [errors, setErrors] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirming, setConfirming] = useState<Category | null>(null);

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onCreate({ name, color });
    if (result.ok) {
      setName("");
      setColor(CATEGORY_PALETTE[0].value);
      setErrors([]);
    } else {
      setErrors(result.errors);
    }
  }

  function startEditing(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
    setErrors([]);
  }

  function handleRename(id: string) {
    const result = onRename(id, editingName);
    if (result.ok) {
      setEditingId(null);
      setEditingName("");
      setErrors([]);
    } else {
      setErrors(result.errors);
    }
  }

  function handleConfirmDelete() {
    if (!confirming) return;
    onDelete(confirming.id);
    setConfirming(null);
  }

  const confirmingCount = confirming
    ? countEntriesForCategory(entries, confirming.id)
    : 0;

  return (
    <section aria-labelledby="categories-heading" className="space-y-6">
      <div>
        <h2 id="categories-heading" className="sr-only">
          Categories
        </h2>
      </div>

      <Card>
        <CardContent>
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <label
              htmlFor="category-name"
              className="flex flex-1 flex-col gap-1.5"
            >
              <span className="text-xs font-medium text-muted-foreground">
                Name
              </span>
              <Input
                id="category-name"
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Deep work"
                maxLength={60}
              />
            </label>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-xs font-medium text-muted-foreground">
                Colour
              </legend>
              <input type="hidden" name="color" value={color} readOnly />
              <div
                role="radiogroup"
                aria-label="Category colour"
                className="flex flex-wrap gap-2"
              >
                {CATEGORY_PALETTE.map((palette) => (
                  <Button
                    key={palette.value}
                    type="button"
                    role="radio"
                    aria-checked={color === palette.value}
                    aria-label={palette.name}
                    onClick={() => setColor(palette.value)}
                    size="icon-xs"
                    className={cn(
                      "rounded-full ring-offset-2 ring-offset-background",
                      color === palette.value && "ring-2 ring-ring",
                    )}
                    style={swatchStyle(palette.value)}
                  />
                ))}
              </div>
            </fieldset>

            <Button type="submit">
              <PlusIcon data-icon="inline-start" aria-hidden />
              Add category
            </Button>
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

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const builtIn = category.id === UNCATEGORIZED_ID;
          const weekly = weeklyMinutes[category.id] ?? 0;
          return (
            <li key={category.id}>
              <Card className="h-full">
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 inline-block size-4 shrink-0 rounded-full"
                      style={swatchStyle(category.color)}
                    />
                    <div className="min-w-0 flex-1">
                      {editingId === category.id ? (
                        <Input
                          aria-label={`Rename ${category.name}`}
                          value={editingName}
                          onChange={(event) =>
                            setEditingName(event.target.value)
                          }
                          className="h-8"
                        />
                      ) : (
                        <p className="truncate font-medium">{category.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatDuration(weekly)} this week
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!builtIn && (
                      <div
                        role="radiogroup"
                        aria-label={`Colour for ${category.name}`}
                        className="flex flex-1 flex-wrap gap-1.5"
                      >
                        {CATEGORY_PALETTE.map((palette) => (
                          <Button
                            key={palette.value}
                            type="button"
                            role="radio"
                            aria-checked={
                              category.color.toLowerCase() ===
                              palette.value.toLowerCase()
                            }
                            aria-label={`${palette.name} for ${category.name}`}
                            onClick={() =>
                              onRecolor(category.id, palette.value)
                            }
                            size="icon-xs"
                            className={cn(
                              "size-4 rounded-full ring-offset-2 ring-offset-background",
                              category.color.toLowerCase() ===
                                palette.value.toLowerCase() &&
                                "ring-2 ring-ring",
                            )}
                            style={swatchStyle(palette.value)}
                          />
                        ))}
                      </div>
                    )}

                    <div className="ml-auto flex items-center gap-1.5">
                      {editingId === category.id ? (
                        <>
                          <Button
                            type="button"
                            size="icon-sm"
                            aria-label={`Save name for ${category.name}`}
                            onClick={() => handleRename(category.id)}
                          >
                            <CheckIcon aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Cancel rename"
                            onClick={() => setEditingId(null)}
                          >
                            <XIcon aria-hidden />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(category)}
                          >
                            <PencilIcon data-icon="inline-start" aria-hidden />
                            Rename
                          </Button>
                          {builtIn ? (
                            <Button type="button" size="sm" variant="outline" disabled>
                              Delete
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => setConfirming(category)}
                            >
                              Delete
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {confirming ? `“${confirming.name}”` : "category"}?
            </DialogTitle>
            <DialogDescription>
              {deleteCategoryMessage(confirmingCount)} This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(null)}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDelete}>
              Delete category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
