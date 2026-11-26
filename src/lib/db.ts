import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import type { Character, Content, Lesson } from '../content/index.ts'
import type { LessonResult, LessonResults, Progress } from '../lessons/engine.ts'

/* Firestore reads/writes the frontend needs. Content is seeded by scripts/seed.ts. */

export async function fetchContent(): Promise<Content> {
  const [chars, lessons] = await Promise.all([
    getDocs(collection(db, 'characters')),
    getDocs(collection(db, 'lessons')),
  ])
  return {
    characters: Object.fromEntries(chars.docs.map((d) => [d.id, d.data() as Character])),
    lessons: lessons.docs.map((d) => d.data() as Lesson).sort((a, b) => a.index - b.index),
  }
}

export async function fetchProgress(uid: string): Promise<{ progress: Progress; results: LessonResults }> {
  const [progress, results] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'progress')),
    getDocs(collection(db, 'users', uid, 'lessonResults')),
  ])
  return {
    progress: Object.fromEntries(progress.docs.map((d) => [d.id, d.data() as Progress[string]])),
    results: Object.fromEntries(results.docs.map((d) => [d.id, d.data() as LessonResult])),
  }
}

/** Save what finishSession() returned, in one batch (a session is well under the 500-write limit).
    ponytail: last write wins — two tabs finishing the same lesson can drop an attempt or lower
    bestScore. Move to a transaction if that shows up (transactions fail offline, batches don't). */
export async function saveSession(
  uid: string,
  lessonId: string,
  finished: { progress: Progress; result: LessonResult },
): Promise<void> {
  const batch = writeBatch(db)
  for (const [id, record] of Object.entries(finished.progress))
    batch.set(doc(db, 'users', uid, 'progress', id), record)
  batch.set(doc(db, 'users', uid, 'lessonResults', lessonId), finished.result)
  await batch.commit()
}
