"use client";

import { useState, type FormEvent } from "react";

import { CATEGORY_COLORS, UNCATEGORIZED_ID } from "../lib/constants";
import type { ActionResult, Category } from "../lib/types";

export type CategoriesManagerProps = {
  categories: Category[];
  onCreate: (draft: { name: string; color: string }) => ActionResult;
  onRename: (id: string, name: string) => ActionResult;
  onRecolor: (id: string, color: string) => ActionResult;
  onDelete: (id: string) => void;
};

export function CategoriesManager({
  categories,
  onCreate,
  onRename,
  onRecolor,
  onDelete,
}: CategoriesManagerProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [errors, setErrors] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = onCreate({ name, color });
    if (result.ok) {
      setName("");
      setColor(CATEGORY_COLORS[0]);
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

  return (
    <section aria-labelledby="categories-heading" className="space-y-6">
      <h2 id="categories-heading" className="text-xl font-semibold">
        Categories
      </h2>

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          <span>Name</span>
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Deep work"
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span>Color</span>
          <input
            name="color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </label>
        <button type="submit" className="rounded bg-indigo-600 px-3 py-1 text-white">
          Add category
        </button>
      </form>

      {errors.length > 0 && (
        <ul role="alert" className="text-sm text-red-600">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <ul className="divide-y">
        {categories.map((category) => {
          const builtIn = category.id === UNCATEGORIZED_ID;
          return (
            <li key={category.id} className="flex items-center gap-3 py-2">
              <span
                aria-hidden
                className="inline-block h-4 w-4 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {editingId === category.id ? (
                <>
                  <input
                    aria-label={`Rename ${category.name}`}
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className="rounded border px-2 py-1"
                  />
                  <button
                    type="button"
                    onClick={() => handleRename(category.id)}
                    className="rounded bg-indigo-600 px-2 py-1 text-sm text-white"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded border px-2 py-1 text-sm"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1">{category.name}</span>
                  <input
                    aria-label={`Color for ${category.name}`}
                    type="color"
                    value={category.color}
                    onChange={(event) => onRecolor(category.id, event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => startEditing(category)}
                    className="rounded border px-2 py-1 text-sm"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    disabled={builtIn}
                    onClick={() => onDelete(category.id)}
                    className="rounded border px-2 py-1 text-sm disabled:opacity-40"
                  >
                    Delete
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
