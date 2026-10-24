import { redirect } from "next/navigation";

/**
 * Export / import moved into Settings, so the old Data route now redirects.
 */
export default function DataPage() {
  redirect("/settings");
}
