import { redirect } from "next/navigation";

/**
 * Charts moved onto the dashboard, so the old Reports route now redirects.
 */
export default function ReportsPage() {
  redirect("/");
}
