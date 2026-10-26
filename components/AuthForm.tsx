"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { getBackend } from "../lib/config";
import { getBrowserSupabaseClient } from "../lib/supabase/client";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";

export type AuthMode = "login" | "signup";

const MIN_PASSWORD_LENGTH = 6;

// The backend never changes while the page is open, so the subscription is a
// no-op. `useSyncExternalStore` lets us read a client-only value without a
// hydration mismatch (the server snapshot is always `false`).
const subscribeToBackend = () => () => {};
const getCloudEnabledSnapshot = () => getBackend() === "supabase";
const getCloudEnabledServerSnapshot = () => getBackend() === "supabase";

/** Only same-origin, absolute paths are accepted as a post-sign-in target. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLogin = mode === "login";
  const nextPath = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>(() => {
    const initial = searchParams.get("error");
    return initial ? [initial] : [];
  });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const cloudEnabled = useSyncExternalStore(
    subscribeToBackend,
    getCloudEnabledSnapshot,
    getCloudEnabledServerSnapshot,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    setMessage(null);

    const nextErrors: string[] = [];
    if (!email.trim()) nextErrors.push("Email is required.");
    if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.push(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    }
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setErrors([
        "Cloud sync is not configured, so accounts are unavailable. Your data stays in this browser.",
      ]);
      return;
    }

    setPending(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrors([error.message]);
          return;
        }
        router.replace(nextPath);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          setErrors([error.message]);
          return;
        }
        if (data.session) {
          router.replace(nextPath);
          router.refresh();
          return;
        }
        setMessage("Check your inbox to confirm your email, then sign in.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="sr-only">
        {isLogin ? "Sign in" : "Create an account"}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{isLogin ? "Sign in" : "Create an account"}</CardTitle>
          <CardDescription>
            {isLogin
              ? "Sign in to sync your tracked time across devices."
              : "Create an account to keep your time in the cloud."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!cloudEnabled && (
            <p
              role="status"
              className="rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground"
            >
              Cloud sync is not configured. Accounts are unavailable and your
              data stays in this browser.
            </p>
          )}

          <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
            <label htmlFor="auth-email" className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Email
              </span>
              <Input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label htmlFor="auth-password" className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Password
              </span>
              <Input
                id="auth-password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                required
              />
            </label>

            {errors.length > 0 && (
              <ul role="alert" className="space-y-1 text-sm text-destructive">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}

            {message && (
              <p role="status" className="text-sm text-muted-foreground">
                {message}
              </p>
            )}

            <Button type="submit" disabled={pending}>
              {pending
                ? "Please wait…"
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="inline-flex min-h-10 items-center rounded text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="inline-flex min-h-10 items-center rounded text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
