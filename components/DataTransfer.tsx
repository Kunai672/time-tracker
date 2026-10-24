"use client";

import { useState, type ChangeEvent } from "react";

import { exportData, importData } from "../lib/importExport";
import type { AppData } from "../lib/types";

export type DataTransferProps = {
  data: AppData;
  onImport: (data: AppData) => void;
  onReset: () => void;
};

export function DataTransfer({ data, onImport, onReset }: DataTransferProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [text, setText] = useState("");

  function handleExport() {
    const json = exportData(data);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "time-tracker-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setErrors([]);
    setMessage("Exported your data.");
  }

  function applyImport(json: string) {
    const result = importData(json);
    if (result.ok) {
      onImport(result.data);
      setErrors([]);
      setMessage(`Imported ${result.data.entries.length} entries.`);
    } else {
      // Validation failed: existing data is left untouched.
      setMessage(null);
      setErrors([result.error]);
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyImport(String(reader.result ?? ""));
    reader.onerror = () => setErrors(["Could not read that file."]);
    reader.readAsText(file);
  }

  return (
    <section aria-labelledby="data-heading" className="space-y-6">
      <h2 id="data-heading" className="text-xl font-semibold">
        Export / Import
      </h2>

      <div className="space-y-2">
        <button
          type="button"
          onClick={handleExport}
          className="rounded bg-indigo-600 px-3 py-1 text-white"
        >
          Export JSON
        </button>
      </div>

      <div className="space-y-2">
        <label className="flex flex-col text-sm">
          <span>Import from file</span>
          <input
            type="file"
            name="import-file"
            accept="application/json,.json"
            onChange={handleFile}
            className="rounded border px-2 py-1"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span>Or paste JSON</span>
          <textarea
            name="import-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            className="rounded border px-2 py-1 font-mono text-xs"
          />
        </label>
        <button
          type="button"
          onClick={() => applyImport(text)}
          className="rounded border px-3 py-1"
        >
          Import pasted JSON
        </button>
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="text-sm text-red-600">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {message && <p className="text-sm text-emerald-700">{message}</p>}

      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Delete all local data? This cannot be undone.")) {
              onReset();
              setMessage("All data cleared.");
            }
          }}
          className="rounded border border-red-500 px-3 py-1 text-red-600"
        >
          Reset all data
        </button>
      </div>
    </section>
  );
}
