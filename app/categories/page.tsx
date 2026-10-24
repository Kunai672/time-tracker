"use client";

import { CategoriesManager } from "../../components/CategoriesManager";
import { useAppData } from "../../components/AppDataProvider";

export default function CategoriesPage() {
  const {
    data,
    ready,
    createCategoryAction,
    renameCategoryAction,
    recolorCategoryAction,
    deleteCategoryAction,
  } = useAppData();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Categories</h1>
      {!ready ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <CategoriesManager
          categories={data.categories}
          onCreate={createCategoryAction}
          onRename={renameCategoryAction}
          onRecolor={recolorCategoryAction}
          onDelete={deleteCategoryAction}
        />
      )}
    </div>
  );
}
