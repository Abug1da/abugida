import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";
import type { Db, Tx } from "@/db";
import { getDb } from "@/db";
import { character, characterProgress, contrastGroup, fidelFamily, lesson, lessonCharacter, lessonResult } from "@/db/schema";
import { getSession } from "@/lib/auth/server";
import type { Character, Content, Lesson } from "./content";
import { lessonStatuses, type LessonStatus, type Progress } from "./engine";

/* Server-side reads for the Fidel course. Content is small (231 characters, a few lessons), so it
   is loaded whole per request and handed to the pure engine. */

export async function loadContent(db: Db = getDb()): Promise<Content> {
  const [families, chars, groups, lessons, links] = await Promise.all([
    db.select().from(fidelFamily),
    db.select().from(character),
    db.select().from(contrastGroup),
    db.select().from(lesson).where(eq(lesson.module, "fidel")).orderBy(asc(lesson.position), asc(lesson.id)),
    db.select().from(lessonCharacter).orderBy(asc(lessonCharacter.position)),
  ]);
  const familyPosition = new Map(families.map((f) => [f.id, f.position]));
  const characters: Record<string, Character> = {};
  for (const c of chars) {
    const contrastFamilies = [...new Set(groups.filter((g) => g.familyIds.includes(c.familyId)).flatMap((g) => g.familyIds))];
    characters[c.id] = {
      id: c.id,
      family: c.familyId,
      familyPosition: familyPosition.get(c.familyId) ?? 0,
      order: c.order,
      romanization: c.romanization,
      audioUrl: c.audioUrl,
      contrastFamilies: contrastFamilies.filter((f) => f !== c.familyId),
    };
  }
  const out: Lesson[] = lessons.map((l) => ({
    id: l.id,
    position: l.position,
    title: l.title,
    status: l.status,
    characterIds: links.filter((x) => x.lessonId === l.id).map((x) => x.characterId),
  }));
  return { characters, lessons: out };
}

export async function loadProgress(userId: string, db: Db | Tx = getDb()): Promise<Progress> {
  const rows = await db.select().from(characterProgress).where(eq(characterProgress.userId, userId));
  return Object.fromEntries(
    rows.map((r) => [r.characterId, { attempts: r.attempts, correct: r.correct, streak: r.streak, lastSeen: r.lastSeen.getTime() }]),
  );
}

export async function loadCompleted(userId: string, db: Db | Tx = getDb()): Promise<Set<string>> {
  const rows = await db
    .select({ lessonId: lessonResult.lessonId, completedAt: lessonResult.completedAt })
    .from(lessonResult)
    .where(eq(lessonResult.userId, userId));
  return new Set(rows.filter((r) => r.completedAt).map((r) => r.lessonId));
}

export type Viewer = { id: string; email: string; isAdmin: boolean };

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await getSession();
  if (!session) return null;
  return { id: session.user.id, email: session.user.email, isAdmin: session.user.role === "admin" };
});

export type LessonAccess =
  | { ok: true; content: Content; lesson: Lesson; status: LessonStatus | "preview" }
  | { ok: false; reason: "missing" | "locked" };

/** May this viewer open this lesson? Learners: published and unlocked. Admins: anything, as a
    preview (drafts and locked lessons included), and previews never write progress. */
export async function lessonAccess(viewer: Viewer, lessonId: string): Promise<LessonAccess> {
  const content = await loadContent();
  const found = content.lessons.find((l) => l.id === lessonId);
  if (!found) return { ok: false, reason: "missing" };
  const statuses = lessonStatuses(content, await loadCompleted(viewer.id));
  const status = statuses[lessonId];
  if (status && status !== "locked") return { ok: true, content, lesson: found, status };
  if (viewer.isAdmin) return { ok: true, content, lesson: found, status: "preview" };
  return { ok: false, reason: found.status === "published" ? "locked" : "missing" };
}

export async function lessonResultFor(userId: string, lessonId: string) {
  const [row] = await getDb()
    .select()
    .from(lessonResult)
    .where(and(eq(lessonResult.userId, userId), eq(lessonResult.lessonId, lessonId)));
  return row ?? null;
}
