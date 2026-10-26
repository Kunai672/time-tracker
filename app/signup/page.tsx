import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthForm } from "../../components/AuthForm";
import { Skeleton } from "../../components/ui/skeleton";

export const metadata: Metadata = { title: "Create account · Time Tracker" };

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-sm">
          <Skeleton className="h-80 w-full" />
        </div>
      }
    >
      <AuthForm mode="signup" />
    </Suspense>
  );
}
