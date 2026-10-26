"use client";

import { LogOutIcon } from "lucide-react";

import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { useAuthUser, useSignOut } from "./useAuthUser";

/**
 * Settings account card. Renders nothing on the local backend, keeping the
 * settings page identical when Supabase is not configured.
 */
export function AccountCard() {
  const { data: user, isPending } = useAuthUser();
  const signOut = useSignOut();

  if (isPending || !user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>
          Your tracked time is synced to this account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="truncate text-sm font-medium">
          {user.email ?? "Signed in"}
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={() => void signOut()}
          className="shrink-0"
        >
          <LogOutIcon data-icon="inline-start" aria-hidden />
          Sign out
        </Button>
      </CardContent>
    </Card>
  );
}
