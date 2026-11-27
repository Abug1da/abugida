import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Lessons" };

export default async function Page() {
  // Outside any <Suspense> so a logged-out visitor gets a real 307, not a streamed meta redirect.
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-8 px-gutter py-section">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Lessons</h1>
        <p className="text-sm break-words text-muted-foreground">Signed in as {session.user.email}</p>
      </div>

      {/* Placeholder until the lesson list exists. */}
      <section className="flex max-w-reading flex-col gap-3 rounded-xl border border-dashed p-6">
        <p lang="am" className="font-fidel text-4xl text-primary">
          ሀ ለ ሐ መ
        </p>
        <h2 className="text-xl font-semibold">Lessons are coming: the fidel first</h2>
        <p className="leading-relaxed text-muted-foreground">
          The first lessons teach the fidel a few letters at a time. They will show up here when they are ready.
        </p>
      </section>
    </main>
  );
}
