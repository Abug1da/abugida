"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { characterProgress, lessonResult, testSession } from "@/db/schema";
import { lessonAccess, getViewer, loadContent, loadProgress } from "@/lib/fidel/data";
import { nextPublishedLessonId } from "@/lib/fidel/content";
import { createSession, finishSession, submit, type Session } from "@/lib/fidel/engine";
import { romanizationsFor, toView, type AnswerResult, type QuestionView } from "@/lib/fidel/view";

/* The graded Test. The server builds the questions and keeps the answer key in test_session;
   the browser only ever gets display text and answers by option index. Each answer must be for
   the question at the head of the queue (`step`), and finishing happens once, in a transaction
   guarded by finished_at, so replays and double submits can't change a score. */

// romanizations: what the Test showed at the start, kept even if someone edits them mid-Test.
type TestState = { session: Session; step: number; romanizations: Record<string, string> };
type Start = { ok: true; sessionId: string; question: QuestionView; remaining: number } | { ok: false; error: string };

export async function startTest(lessonId: string): Promise<Start> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Log in to take the test." };
  const access = await lessonAccess(viewer, lessonId);
  if (!access.ok) return { ok: false, error: "This lesson isn't available yet." };
  if (access.status === "preview") return { ok: false, error: "Previews don't record tests." };

  const session = createSession(access.content, access.lesson, await loadProgress(viewer.id));
  const id = crypto.randomUUID();
  const state: TestState = { session, step: 0, romanizations: romanizationsFor(session.queue, access.content) };
  await getDb().transaction(async (tx) => {
    // One open Test per learner: starting a new one abandons the old. The per-user lock makes two
    // tabs starting at once take turns instead of colliding on the one-open-Test index.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${viewer.id}, 0))`);
    await tx.delete(testSession).where(and(eq(testSession.userId, viewer.id), isNull(testSession.finishedAt)));
    await tx.insert(testSession).values({ id, userId: viewer.id, lessonId, state });
  });
  return { ok: true, sessionId: id, question: toView(session.queue[0], state.romanizations), remaining: session.queue.length };
}

export async function answerTest(sessionId: string, step: number, optionIndex: number): Promise<AnswerResult | { error: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Log in to take the test." };
  const content = await loadContent();
  let finishedLessonId: string | null = null;

  const result = await getDb().transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(testSession)
      .where(and(eq(testSession.id, sessionId), eq(testSession.userId, viewer.id), isNull(testSession.finishedAt)))
      .for("update");
    if (!row) return { error: "This test has ended. Start it again from the lesson." };
    const state = row.state as TestState;
    const question = state.session.queue[0];
    if (step !== state.step || !question) return { error: "That answer was already recorded." };
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length)
      return { error: "Pick one of the options." };

    const { correct, session } = submit(state.session, question.options[optionIndex]);
    const correctIndex = question.options.indexOf(question.answer);

    if (session.queue.length) {
      await tx
        .update(testSession)
        .set({ state: { ...state, session, step: state.step + 1 } satisfies TestState })
        .where(eq(testSession.id, sessionId));
      return {
        correct,
        correctIndex,
        next: { question: toView(session.queue[0], state.romanizations), remaining: session.queue.length },
      };
    }

    // Last answer: score it, record progress and the result, and close the session.
    const now = new Date();
    const progress = await loadProgress(viewer.id, tx);
    const done = finishSession(session, progress, now.getTime());
    for (const [characterId, r] of Object.entries(done.progress)) {
      const values = { attempts: r.attempts, correct: r.correct, streak: r.streak, lastSeen: now };
      await tx
        .insert(characterProgress)
        .values({ userId: viewer.id, characterId, ...values })
        .onConflictDoUpdate({ target: [characterProgress.userId, characterProgress.characterId], set: values });
    }
    await tx
      .insert(lessonResult)
      .values({
        userId: viewer.id,
        lessonId: row.lessonId,
        bestScore: done.score,
        attempts: 1,
        completedAt: done.passed ? now : null,
        lastPlayed: now,
      })
      .onConflictDoUpdate({
        target: [lessonResult.userId, lessonResult.lessonId],
        set: {
          bestScore: sql`greatest(${lessonResult.bestScore}, excluded.best_score)`,
          attempts: sql`${lessonResult.attempts} + 1`,
          completedAt: sql`coalesce(${lessonResult.completedAt}, excluded.completed_at)`,
          lastPlayed: now,
        },
      });
    await tx
      .update(testSession)
      .set({ state: { ...state, session, step: state.step + 1 }, finishedAt: now })
      .where(eq(testSession.id, sessionId));
    const nextLessonId = nextPublishedLessonId(content, row.lessonId);
    finishedLessonId = row.lessonId;
    return { correct, correctIndex, done: { score: done.score, passed: done.passed, nextLessonId } };
  });

  // The lesson list (statuses) changed. Skipped if the lesson was unpublished mid-Test, since
  // revalidating also re-renders this lesson's page, which would then be a 404.
  const stillPublished = content.lessons.some((l) => l.status === "published" && l.id === finishedLessonId);
  if (finishedLessonId && stillPublished) revalidatePath("/lessons");
  return result;
}
