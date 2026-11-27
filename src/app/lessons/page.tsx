import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Lessons" };

export default async function Page() {
  // Outside any <Suspense> so a logged-out visitor gets a real 307, not a streamed meta redirect.
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold">Lessons</h1>
      <p className="mt-4 text-muted-foreground">Signed in as {session.user.email}. Lessons come next.</p>
    </main>
  );
}
