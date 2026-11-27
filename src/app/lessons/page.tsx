import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, loadCompleted, loadContent } from "@/lib/fidel/data";
import { lessonStatuses } from "@/lib/fidel/engine";

export const metadata: Metadata = { title: "Lessons" };

const LABEL = { complete: "Done", available: "Start", locked: "Locked" } as const;

export default async function Page() {
  // Outside any <Suspense> so a logged-out visitor gets a real 307, not a streamed meta redirect.
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const content = await loadContent();
  const statuses = lessonStatuses(content, await loadCompleted(viewer.id));
  const lessons = content.lessons.filter((l) => l.status === "published" || viewer.isAdmin);

  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-8 px-gutter py-section">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">The fidel</h1>
        <p className="max-w-reading leading-relaxed text-muted-foreground">
          Learn the Amharic alphabet a few rows at a time. Pass each lesson&apos;s test to unlock the next.
        </p>
      </div>
      <ol className="flex flex-col gap-3">
        {lessons.map((l, i) => {
          const status = statuses[l.id];
          const open = status !== "locked" || viewer.isAdmin;
          const sample = l.characterIds.slice(0, 6).join(" ");
          const body = (
            <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm text-muted-foreground">Lesson {i + 1}</span>
                <span className="font-semibold">{l.title}</span>
                <span lang="am" className="truncate font-ethiopic text-lg text-primary">
                  {sample}
                </span>
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">
                {l.status === "draft" ? "Draft" : status ? LABEL[status] : ""}
              </span>
            </div>
          );
          return (
            <li key={l.id} className={open ? "" : "opacity-60"}>
              {open ? (
                <Link href={`/lessons/${l.id}`} className="block hover:bg-muted/50 rounded-xl">
                  {body}
                </Link>
              ) : (
                body
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
