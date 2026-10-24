"use client";

import { useState, type FormEvent } from "react";

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

/** Default form values. Only ever called from the browser (the page mounts
 * this component after storage has loaded), so `new Date()` is safe. */
function makeEmptyForm(categories: Category[]) {
  const now = toDatetimeLocalValue(new Date().toISOString());
  return {
    description: "",
    categoryId: categories[0]?.id ?? "",
    start: now,
    end: now,
  };
}

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

    const result = editingId
      ? onUpdate(editingId, draft)
      : onCreate(draft);

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
      <h2 id="entries-heading" className="text-xl font-semibold">
        {editingId ? "Edit entry" : "Add entry"}
      </h2>

      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col text-sm">
          <span>Description</span>
          <input
            name="description"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span>Category</span>
          <select
            name="categoryId"
            value={form.categoryId}
            onChange={(event) =>
              setForm((current) => ({ ...current, categoryId: event.target.value }))
            }
            className="rounded border px-2 py-1"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span>Start</span>
          <input
            name="start"
            type="datetime-local"
            value={form.start}
            onChange={(event) =>
              setForm((current) => ({ ...current, start: event.target.value }))
            }
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span>End</span>
          <input
            name="end"
            type="datetime-local"
            value={form.end}
            onChange={(event) =>
              setForm((current) => ({ ...current, end: event.target.value }))
            }
            className="rounded border px-2 py-1"
          />
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" className="rounded bg-indigo-600 px-3 py-1 text-white">
            {editingId ? "Save changes" : "Add entry"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded border px-3 py-1">
              Cancel
            </button>
          )}
        </div>
      </form>

      {errors.length > 0 && (
        <ul role="alert" className="text-sm text-red-600">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">No entries yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-2">Description</th>
              <th className="py-2">Category</th>
              <th className="py-2">Start</th>
              <th className="py-2">End</th>
              <th className="py-2">Duration</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const category = findCategory(categories, entry.categoryId);
              return (
                <tr key={entry.id} className="border-b">
                  <td className="py-2">{entry.description}</td>
                  <td className="py-2">{category?.name ?? "Uncategorized"}</td>
                  <td className="py-2">{new Date(entry.start).toLocaleString()}</td>
                  <td className="py-2">{new Date(entry.end).toLocaleString()}</td>
                  <td className="py-2">{formatDuration(entry.durationMinutes)}</td>
                  <td className="flex gap-2 py-2">
                    <button
                      type="button"
                      onClick={() => startEditing(entry)}
                      className="rounded border px-2 py-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(entry.id)}
                      className="rounded border px-2 py-1"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
