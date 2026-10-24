"use client";

import { useAppData } from "../../components/AppDataProvider";
import { DataTransfer } from "../../components/DataTransfer";

export default function DataPage() {
  const { data, ready, replaceDataAction, resetAction } = useAppData();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Data</h1>
      {!ready ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <DataTransfer
          data={data}
          onImport={replaceDataAction}
          onReset={resetAction}
        />
      )}
    </div>
  );
}
