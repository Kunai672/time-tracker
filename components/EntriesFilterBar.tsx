"use client";

import { CalendarIcon, SearchIcon, TagIcon, XIcon } from "lucide-react";

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
  DATE_RANGE_PRESETS,
  presetRange,
  type DateRangePreset,
  type EntryFilters,
} from "../lib/filters";
import type { Category } from "../lib/types";

export type EntriesFilterBarProps = {
  filters: EntryFilters;
  preset: DateRangePreset;
  categories: Category[];
  /** Injected clock so preset ranges are deterministic. */
  now: Date;
  onChange: (filters: EntryFilters) => void;
  onPresetChange: (preset: DateRangePreset) => void;
};

/** Sticky filter bar: date preset, category multi-select and free-text search. */
export function EntriesFilterBar({
  filters,
  preset,
  categories,
  now,
  onChange,
  onPresetChange,
}: EntriesFilterBarProps) {
  const selectedCategories = filters.categoryIds ?? [];

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

  return (
    <div className="sticky top-14 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-1.5">
          <CalendarIcon
            className="size-4 text-muted-foreground"
            aria-hidden
          />
          <Select value={preset} onValueChange={handlePreset}>
            <SelectTrigger aria-label="Date range" className="w-40">
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
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            <TagIcon data-icon="inline-start" aria-hidden />
            Categories
            {selectedCategories.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedCategories.length}
              </Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
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

        <div className="relative lg:ml-auto lg:w-72">
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

        <Button type="button" variant="ghost" onClick={clearFilters}>
          <XIcon data-icon="inline-start" aria-hidden />
          Clear
        </Button>
      </div>
    </div>
  );
}
