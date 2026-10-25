"use client";

import { useState } from "react";
import {
  CalendarIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  TagIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import {
  DATE_RANGE_PRESETS,
  activeFilterChips,
  hasActiveFilters,
  presetRange,
  type DateRangePreset,
  type EntryFilters,
  type FilterChip,
} from "../lib/filters";
import type { Category } from "../lib/types";
import { cn } from "../lib/utils";

export type EntriesFilterBarProps = {
  filters: EntryFilters;
  preset: DateRangePreset;
  categories: Category[];
  /** Injected clock so preset ranges are deterministic. */
  now: Date;
  onChange: (filters: EntryFilters) => void;
  onPresetChange: (preset: DateRangePreset) => void;
};

/**
 * Filter bar for the entries page. One row at 768px and above; below that a
 * "Filters" button opens a bottom sheet, and the active filters are shown as
 * removable chips. "Clear" only appears while something is filtered.
 */
export function EntriesFilterBar({
  filters,
  preset,
  categories,
  now,
  onChange,
  onPresetChange,
}: EntriesFilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const selectedCategories = filters.categoryIds ?? [];
  const active = hasActiveFilters(filters, preset);
  const chips = activeFilterChips(filters, preset, categories);

  function handlePreset(value: string | null) {
    if (!value) return;
    const next = value as DateRangePreset;
    onPresetChange(next);
    const range = presetRange(next, now);
    onChange({ ...filters, from: range.from, to: range.to });
  }

  function toggleCategory(id: string) {
    const next = selectedCategories.includes(id)
      ? selectedCategories.filter((item) => item !== id)
      : [...selectedCategories, id];
    onChange({ ...filters, categoryId: undefined, categoryIds: next });
  }

  function clearFilters() {
    onPresetChange("all");
    onChange({});
  }

  function removeChip(chip: FilterChip) {
    if (chip.kind === "date") {
      onPresetChange("all");
      onChange({ ...filters, from: undefined, to: undefined });
    } else if (chip.kind === "search") {
      onChange({ ...filters, search: undefined });
    } else {
      onChange({
        ...filters,
        categoryId: undefined,
        categoryIds: selectedCategories.filter((id) => id !== chip.id),
      });
    }
  }

  const controls = (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="flex items-center gap-1.5">
        <CalendarIcon className="size-4 text-muted-foreground" aria-hidden />
        <Select value={preset} onValueChange={handlePreset}>
          <SelectTrigger aria-label="Date range" className="w-full md:w-40">
            <SelectValue>
              {(value) =>
                DATE_RANGE_PRESETS.find((item) => item.value === value)
                  ?.label ?? "All time"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_PRESETS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="w-full md:w-auto" />}
        >
          <TagIcon data-icon="inline-start" aria-hidden />
          Categories
          {selectedCategories.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {selectedCategories.length}
            </Badge>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-80 overflow-y-auto"
        >
          <DropdownMenuLabel>Filter by category</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {categories.map((category) => (
            <DropdownMenuCheckboxItem
              key={category.id}
              checked={selectedCategories.includes(category.id)}
              onCheckedChange={() => toggleCategory(category.id)}
            >
              <span
                className="inline-block size-3 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden
              />
              {category.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="relative md:ml-auto md:w-56 xl:w-72">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Search descriptions"
          placeholder="Search descriptions…"
          value={filters.search ?? ""}
          onChange={(event) =>
            onChange({ ...filters, search: event.target.value || undefined })
          }
          className="pl-8"
        />
      </div>

      {active && (
        <Button type="button" variant="ghost" onClick={clearFilters}>
          <XIcon data-icon="inline-start" aria-hidden />
          Clear
        </Button>
      )}
    </div>
  );

  return (
    <div className="relative z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:sticky md:top-14 md:-mx-6 md:flex md:h-16 md:items-center md:px-6 md:py-0">
      <div className="hidden w-full md:block">{controls}</div>

      <div className="flex flex-col gap-2 md:hidden">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSheetOpen(true)}
          >
            <SlidersHorizontalIcon data-icon="inline-start" aria-hidden />
            Filters
            {chips.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {chips.length}
              </Badge>
            )}
          </Button>
          {active && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              <XIcon data-icon="inline-start" aria-hidden />
              Clear
            </Button>
          )}
        </div>

        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li key={`${chip.kind}-${chip.id}`}>
                <button
                  type="button"
                  onClick={() => removeChip(chip)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  )}
                >
                  {chip.label}
                  <XIcon className="size-3.5 shrink-0" aria-hidden />
                  <span className="sr-only">Remove filter</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Narrow the list by date, category or description.
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-6">{controls}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
