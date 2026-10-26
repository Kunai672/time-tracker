"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { DownloadIcon, FileUpIcon, UploadIcon } from "lucide-react";

import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "./ui/accordion";
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
import { Textarea } from "./ui/textarea";
import { exportData, importData } from "../lib/importExport";
import type { AppData } from "../lib/types";
import { cn } from "../lib/utils";

export type DataTransferProps = {
  data: AppData;
  onImport: (data: AppData) => void;
  onReset: () => void;
};

/** Human-friendly byte count for the data summary. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function DataTransfer({ data, onImport, onReset }: DataTransferProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const json = exportData(data);
  const size = formatSize(new TextEncoder().encode(json).length);

  function handleExport() {
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

  function applyImport(source: string) {
    const result = importData(source);
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

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => applyImport(String(reader.result ?? ""));
    reader.onerror = () => setErrors(["Could not read that file."]);
    reader.readAsText(file);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) readFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  return (
    <section aria-labelledby="data-heading" className="space-y-4">
      <h2 id="data-heading" className="sr-only">
        Data
      </h2>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>
            Everything lives in this browser. Export a backup or restore one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Entries</dt>
              <dd className="font-medium tabular-nums">{data.entries.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Categories</dt>
              <dd className="font-medium tabular-nums">
                {data.categories.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Size</dt>
              <dd className="font-medium tabular-nums">{size}</dd>
            </div>
          </dl>

          <Button type="button" onClick={handleExport}>
            <DownloadIcon data-icon="inline-start" aria-hidden />
            Export JSON
          </Button>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30",
            )}
          >
            <FileUpIcon className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium">Drop a JSON file to import</p>
            <p className="text-xs text-muted-foreground">or</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInput.current?.click()}
            >
              <UploadIcon data-icon="inline-start" aria-hidden />
              Choose file
            </Button>
            <input
              ref={fileInput}
              id="import-file"
              name="import-file"
              type="file"
              aria-label="Import from file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>

          <Accordion keepMounted>
            <AccordionItem value="paste">
              <AccordionTrigger>Or paste JSON</AccordionTrigger>
              <AccordionPanel>
                <div className="space-y-3">
                  <label htmlFor="import-text" className="sr-only">
                    JSON to import
                  </label>
                  <Textarea
                    id="import-text"
                    name="import-text"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    rows={6}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => applyImport(text)}
                  >
                    <UploadIcon data-icon="inline-start" aria-hidden />
                    Import pasted JSON
                  </Button>
                </div>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>

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
