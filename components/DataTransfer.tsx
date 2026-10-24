"use client";

import { useState, type ChangeEvent } from "react";
import { DownloadIcon, UploadIcon } from "lucide-react";

import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
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
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    <section aria-labelledby="data-heading" className="space-y-4">
      <h2 id="data-heading" className="sr-only">
        Export and import
      </h2>

      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>
            Download a JSON copy of everything stored in this browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={handleExport}>
            <DownloadIcon data-icon="inline-start" aria-hidden />
            Export JSON
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import</CardTitle>
          <CardDescription>
            Restore from a file or paste JSON. Invalid files are rejected
            before anything changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label htmlFor="import-file" className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Import from file
            </span>
            <Input
              id="import-file"
              type="file"
              name="import-file"
              accept="application/json,.json"
              onChange={handleFile}
            />
          </label>

          <label htmlFor="import-text" className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Or paste JSON
            </span>
            <Textarea
              id="import-text"
              name="import-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
          </label>

          <Button
            type="button"
            variant="outline"
            onClick={() => applyImport(text)}
          >
            <UploadIcon data-icon="inline-start" aria-hidden />
            Import pasted JSON
          </Button>

          {errors.length > 0 && (
            <ul role="alert" className="space-y-1 text-sm text-destructive">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
          {message && <p className="text-sm text-success">{message}</p>}
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>
            Clear every entry, timer and category from this browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            Reset all data
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear all data?</DialogTitle>
            <DialogDescription>
              This deletes every entry, the running timer and all categories
              except Uncategorized. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onReset();
                setConfirmOpen(false);
                setMessage("All data cleared.");
              }}
            >
              Clear all data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
