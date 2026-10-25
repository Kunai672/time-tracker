"use client";

import { useState, type FormEvent } from "react";
import {
  CheckIcon,
  MoreHorizontalIcon,
  PaletteIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
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
  /** Entries, so the cards can show counts and the delete dialog can warn. */
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

function ColorSwatches({
  value,
  onSelect,
  labelPrefix,
}: {
  value: string;
  onSelect: (color: string) => void;
  labelPrefix: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={labelPrefix}
      className="flex flex-wrap gap-1.5"
    >
      {CATEGORY_PALETTE.map((palette) => (
        <Button
          key={palette.value}
          type="button"
          role="radio"
          aria-checked={value.toLowerCase() === palette.value.toLowerCase()}
          aria-label={`${palette.name} ${labelPrefix.toLowerCase()}`}
          onClick={() => onSelect(palette.value)}
          size="icon-xs"
          className={cn(
            "rounded-full ring-offset-2 ring-offset-background",
            value.toLowerCase() === palette.value.toLowerCase() &&
              "ring-2 ring-ring",
          )}
          style={swatchStyle(palette.value)}
        />
      ))}
    </div>
  );
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
  const [createErrors, setCreateErrors] = useState<string[]>([]);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const [renaming, setRenaming] = useState<Category | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameErrors, setRenameErrors] = useState<string[]>([]);

  const [colorFor, setColorFor] = useState<string | null>(null);
  const [pendingColor, setPendingColor] = useState<string>(
    CATEGORY_PALETTE[0].value,
  );

  const [confirming, setConfirming] = useState<Category | null>(null);

  const weekTotal = Object.values(weeklyMinutes).reduce(
    (sum, minutes) => sum + minutes,
    0,
  );

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onCreate({ name, color });
    if (result.ok) {
      setName("");
      setColor(CATEGORY_PALETTE[0].value);
      setCreateErrors([]);
    } else {
      setCreateErrors(result.errors);
    }
  }

  function openRename(category: Category) {
    setRenaming(category);
    setRenameValue(category.name);
    setRenameErrors([]);
  }

  function handleRename() {
    if (!renaming) return;
    const result = onRename(renaming.id, renameValue);
    if (result.ok) {
      setRenaming(null);
      setRenameValue("");
      setRenameErrors([]);
    } else {
      setRenameErrors(result.errors);
    }
  }

  function handleConfirmColor(category: Category) {
    onRecolor(category.id, pendingColor);
    setColorFor(null);
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
      <h2 id="categories-heading" className="sr-only">
        Categories
      </h2>

      <Card>
        <CardContent>
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <label
              htmlFor="category-name"
              className="flex min-w-0 flex-1 flex-col gap-1.5"
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

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Color
              </span>
              <input type="hidden" name="color" value={color} readOnly />
              <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start"
                      aria-label="Pick a category color"
                    />
                  }
                >
                  <span
                    className="size-4 shrink-0 rounded-full"
                    style={swatchStyle(color)}
                    aria-hidden
                  />
                  Color
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto">
                  <ColorSwatches
                    value={color}
                    onSelect={(value) => {
                      setColor(value);
                      setColorPickerOpen(false);
                    }}
                    labelPrefix="Category color"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button type="submit">
              <PlusIcon data-icon="inline-start" aria-hidden />
              Add category
            </Button>
          </form>

          {createErrors.length > 0 && (
            <ul
              role="alert"
              className="mt-3 space-y-1 text-sm text-destructive"
            >
              {createErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ul className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const builtIn = category.id === UNCATEGORIZED_ID;
          const weekly = weeklyMinutes[category.id] ?? 0;
          const count = countEntriesForCategory(entries, category.id);
          const share =
            weekTotal > 0 ? Math.round((weekly / weekTotal) * 100) : 0;
          const pickerOpen = colorFor === category.id;

          return (
            <li key={category.id}>
              <Card className="h-full">
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <Popover
                      open={pickerOpen}
                      onOpenChange={(open) => {
                        if (open) {
                          setPendingColor(category.color);
                          setColorFor(category.id);
                        } else {
                          setColorFor(null);
                        }
                      }}
                    >
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="shrink-0 rounded-full p-0"
                            aria-label={`Change color for ${category.name}`}
                          />
                        }
                      >
                        <span
                          aria-hidden
                          className="size-4 rounded-full"
                          style={swatchStyle(category.color)}
                        />
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto gap-3">
                        <p className="text-sm font-medium">Change color</p>
                        <ColorSwatches
                          value={pendingColor}
                          onSelect={setPendingColor}
                          labelPrefix={`New color for ${category.name}`}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setColorFor(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleConfirmColor(category)}
                          >
                            <CheckIcon data-icon="inline-start" aria-hidden />
                            Save color
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{category.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatDuration(weekly)} this week ·{" "}
                        {count === 1 ? "1 entry" : `${count} entries`}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            aria-label={`Actions for ${category.name}`}
                          />
                        }
                      >
                        <MoreHorizontalIcon aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openRename(category)}>
                          <PencilIcon aria-hidden />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setPendingColor(category.color);
                            setColorFor(category.id);
                          }}
                        >
                          <PaletteIcon aria-hidden />
                          Change color
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={builtIn}
                          onClick={() => setConfirming(category)}
                        >
                          <Trash2Icon aria-hidden />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-auto space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                      <span>Share this week</span>
                      <span className="tabular-nums">{share}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${share}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => {
          if (!open) setRenaming(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename category</DialogTitle>
            <DialogDescription>
              Give {renaming ? `“${renaming.name}”` : "this category"} a new
              name.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleRename();
            }}
          >
            <label
              htmlFor="rename-category"
              className="flex flex-col gap-1.5"
            >
              <span className="text-xs font-medium text-muted-foreground">
                Name
              </span>
              <Input
                id="rename-category"
                name="rename"
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                maxLength={60}
              />
            </label>
            {renameErrors.length > 0 && (
              <ul role="alert" className="space-y-1 text-sm text-destructive">
                {renameErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenaming(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save name</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
