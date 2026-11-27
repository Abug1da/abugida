import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign up" };

export default function Page() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <AuthForm mode="signup" />
    </main>
  );
}
