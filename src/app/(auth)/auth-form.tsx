"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

// Goes through /api/auth (not a server action) so Better Auth's rate limiting applies.
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  // onSubmit rather than <form action>: React resets the form after an action, which would wipe
  // what the learner typed whenever login fails.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      setError(undefined);
      try {
        const { error } = signup
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({ email, password });
        if (error) {
          setError(error.message ?? "Something went wrong. Try again.");
          return;
        }
      } catch {
        setError("Couldn't reach the server. Check your connection and try again.");
        return;
      }
      router.push("/lessons");
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{signup ? "Create your account" : "Welcome back"}</CardTitle>
        <CardDescription>
          {signup ? "Abugida is free. Your progress is saved to your account." : "Log in to pick up where you left off."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {signup && (
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoComplete="name" required />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "One moment…" : signup ? "Sign up" : "Log in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {signup ? "Already have an account? " : "New here? "}
            <Link href={signup ? "/login" : "/signup"} className="underline underline-offset-4">
              {signup ? "Log in" : "Sign up"}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
