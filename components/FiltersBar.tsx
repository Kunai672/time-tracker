"use client";

import { ALL_CATEGORIES, type EntryFilters } from "../lib/filters";
import type { Category } from "../lib/types";

export type FiltersBarProps = {
  filters: EntryFilters;
  categories: Category[];
  onChange: (filters: EntryFilters) => void;
};

export function FiltersBar({ filters, categories, onChange }: FiltersBarProps) {
  return (
    <form
      aria-label="Filters"
      className="flex flex-wrap items-end gap-3 rounded border p-3"
      onSubmit={(event) => event.preventDefault()}
    >
      <label className="flex flex-col text-sm">
        <span>From</span>
        <input
          type="date"
          name="from"
          value={filters.from ?? ""}
          onChange={(event) =>
            onChange({ ...filters, from: event.target.value || undefined })
          }
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="flex flex-col text-sm">
        <span>To</span>
        <input
          type="date"
          name="to"
          value={filters.to ?? ""}
          onChange={(event) =>
            onChange({ ...filters, to: event.target.value || undefined })
          }
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="flex flex-col text-sm">
        <span>Category</span>
        <select
          name="categoryId"
          value={filters.categoryId ?? ALL_CATEGORIES}
          onChange={(event) => onChange({ ...filters, categoryId: event.target.value })}
          className="rounded border px-2 py-1"
        >
          <option value={ALL_CATEGORIES}>All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => onChange({ categoryId: ALL_CATEGORIES })}
        className="rounded border px-3 py-1 text-sm"
      >
        Clear filters
      </button>
    </form>
  );
}
