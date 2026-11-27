import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getViewer, lessonAccess, loadProgress } from "@/lib/fidel/data";
import { createSession } from "@/lib/fidel/engine";
import { romanizationsFor, toView } from "@/lib/fidel/view";
import { LessonPlayer, type PracticeQuestion } from "./lesson-player";

export const metadata: Metadata = { title: "Lesson" };

export default async function Page({ params }: PageProps<"/lessons/[id]">) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  // Learners only reach published, unlocked lessons; admins can preview anything.
  const access = await lessonAccess(viewer, id);
  if (!access.ok) {
    if (access.reason === "locked") redirect("/lessons");
    notFound();
  }
  const { content, lesson } = access;

  // Practice runs in the browser, so its questions travel with their answers. The graded Test
  // is built on the server when it starts (actions.ts) and never does.
  // A draft that isn't publishable yet (too few characters or sounds) can still be previewed; it
  // just has no Practice.
  let practice: PracticeQuestion[] = [];
  try {
    const { queue } = createSession(content, lesson, await loadProgress(viewer.id));
    const romanizations = romanizationsFor(queue, content);
    practice = queue.map((q) => ({ view: toView(q, romanizations), answerIndex: q.options.indexOf(q.answer) }));
  } catch (error) {
    if (access.status !== "preview") throw error;
  }
  const cards = lesson.characterIds.map((cid) => {
    const c = content.characters[cid];
    return { fidel: c.id, romanization: c.romanization, audioUrl: c.audioUrl };
  });

  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-6 px-gutter py-section">
      <div className="flex flex-col gap-1">
        {access.status === "preview" && (
          <p className="text-sm font-medium text-primary">
            Preview{lesson.status === "draft" ? " of a draft" : ""}: nothing here is recorded.
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight">{lesson.title}</h1>
      </div>
      <LessonPlayer
        lessonId={lesson.id}
        cards={cards}
        practice={practice}
        preview={access.status === "preview"}
        alreadyComplete={access.status === "complete"}
      />
    </main>
  );
}
