import type { Character, Content, Lesson, VocabularyItem } from '../content/index.ts'

/* Lesson engine: pure functions, no Firebase, no React.
   Flow: createSession → submit() per answer until queue is empty → finishSession()
   → save its progress + result → lessonStatuses(). */

// recognize: show the fidel, pick its sound.
// produce:   give the sound, pick the fidel. Skipped for sounds shared by several fidel (ሀ/ሐ/ኀ/ኸ).
// contrast:  show the fidel, pick which gebeta row it belongs to, among look-alike and
//            same-sound rows (ሑ → ሀ ሐ ኀ ኸ) — the native-materials contrast drill.
// meaning:   show an Amharic phrase, pick its English meaning.
export type QuestionType = 'recognize' | 'produce' | 'contrast' | 'meaning'

export interface Question {
  type: QuestionType
  subjectId: string // what is being tested: a character ID, or a vocabulary ID — progress is keyed by this
  answer: string // ID of the correct option (differs from subjectId for 'contrast': the row's first-order fidel)
  options: string[] // character IDs; vocabulary IDs for 'meaning'
  retry: boolean
}

export interface Session {
  lessonId: string
  queue: Question[]
  firstTry: Record<string, boolean> // subjectId → answered correctly on the first attempt
}

export interface ProgressRecord {
  attempts: number
  correct: number
  streak: number // consecutive first-try correct answers
  lastSeen: number // ms epoch
}
export type Progress = Record<string, ProgressRecord> // by character ID

export interface LessonResult {
  bestScore: number // 0–1, first-try correct share of the lesson's own items, best session
  attempts: number
  lastPlayed: number // ms epoch
}
export type LessonResults = Record<string, LessonResult> // by lesson ID
export type LessonStatus = 'locked' | 'available' | 'complete'

// ponytail: fixed thresholds, swap for spaced repetition if learners plateau.
export const OPTION_COUNT = 4
export const REVIEW_COUNT = 5
export const MASTERY_STREAK = 2 // only used to pick review items
export const PASS_SCORE = 0.7

const FIDEL_TYPES: QuestionType[] = ['recognize', 'produce', 'contrast']
const AUDIENCE = { m: 'to a man', f: 'to a woman', group: 'to a group' }

export const vocabLabel = (v: VocabularyItem) => (v.audience ? `${v.english} (${AUDIENCE[v.audience]})` : v.english)
export const isMastered = (r?: ProgressRecord) => (r?.streak ?? 0) >= MASTERY_STREAK

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Fill options from candidate tiers in turn, never repeating a label — homophones (ሀ/ሐ/ኀ)
    and same-meaning phrases would otherwise give two right answers. Throws rather than
    return a broken quiz; the UI should catch it at the lesson boundary. */
function pickOptions<T extends { id: string }>(
  target: T,
  label: (t: T) => string,
  tiers: T[][],
  rand: () => number,
): string[] {
  const taken = new Set([label(target)])
  const picked: string[] = []
  for (const candidates of tiers)
    for (const c of shuffle(candidates, rand)) {
      if (picked.length === OPTION_COUNT - 1) break
      if (taken.has(label(c))) continue
      taken.add(label(c))
      picked.push(c.id)
    }
  if (picked.length < OPTION_COUNT - 1) throw new Error(`not enough distinct options for ${target.id}`)
  return shuffle([target.id, ...picked], rand)
}

function fidelQuestion(
  content: Content,
  target: Character,
  preferred: QuestionType,
  pool: Character[],
  rand: () => number,
): Question {
  const all = Object.values(content.characters)
  const knownFamilies = new Set(pool.map((c) => c.family))
  const knownHeads = all.filter((c) => c.order === 0 && knownFamilies.has(c.id))
  // Family match needs: a learned look-alike row, four learned rows to choose from,
  // and a subject that isn't the row head itself ("which row is ጠ from?" answers itself).
  const canContrast =
    target.order !== 0 &&
    knownHeads.length >= OPTION_COUNT &&
    target.contrastFamilies.some((f) => knownFamilies.has(f))
  const ambiguous = all.some((c) => c.id !== target.id && c.romanization === target.romanization)

  let type = preferred
  if (type === 'contrast' && !canContrast) type = 'produce'
  if (type === 'produce' && ambiguous) type = canContrast ? 'contrast' : 'recognize'

  if (type === 'contrast') {
    const head = content.characters[target.family]
    const tiers = [knownHeads.filter((h) => target.contrastFamilies.includes(h.id)), knownHeads]
    return { type, subjectId: target.id, answer: head.id, options: pickOptions(head, (c) => c.id, tiers, rand), retry: false }
  }
  const sameFamily = pool.filter((c) => c.family === target.family)
  const options = pickOptions(target, (c) => c.romanization, [shuffle(sameFamily, rand).slice(0, 2), pool], rand)
  return { type, subjectId: target.id, answer: target.id, options, retry: false }
}

export function createSession(
  content: Content,
  lesson: Lesson,
  progress: Progress,
  rand: () => number = Math.random,
): Session {
  const earlier = content.lessons.filter((l) => l.index <= lesson.index && l.kind === lesson.kind)
  let questions: Question[]

  if (lesson.kind === 'vocabulary') {
    const pool = earlier.flatMap((l) => l.vocabulary)
    questions = lesson.vocabulary.map((v) => ({
      type: 'meaning' as const,
      subjectId: v.id,
      answer: v.id,
      options: pickOptions(v, vocabLabel, [lesson.vocabulary, pool], rand),
      retry: false,
    }))
  } else {
    const pool = earlier.flatMap((l) => l.characterIds.map((id) => content.characters[id]))
    questions = shuffle(lesson.characterIds.map((id) => content.characters[id]), rand).map((c, i) =>
      fidelQuestion(content, c, FIDEL_TYPES[i % FIDEL_TYPES.length], pool, rand),
    )
    // Review: weakest characters from earlier lessons — unmastered first, then least recently seen.
    // Counts toward progress, not toward the lesson score.
    const review = pool
      .filter((c) => !lesson.characterIds.includes(c.id))
      .map((c) => ({ c, r: progress[c.id] }))
      .sort((a, b) => Number(isMastered(a.r)) - Number(isMastered(b.r)) || (a.r?.lastSeen ?? 0) - (b.r?.lastSeen ?? 0))
      .slice(0, REVIEW_COUNT)
      .map(({ c }, i) => fidelQuestion(content, c, FIDEL_TYPES[i % FIDEL_TYPES.length], pool, rand))
    questions.push(...review)
  }

  return { lessonId: lesson.id, queue: shuffle(questions, rand), firstTry: {} }
}

/** Answer the head of the queue. A miss is re-asked once at the end; only the first try counts. */
export function submit(session: Session, choiceId: string): { correct: boolean; session: Session } {
  const [q, ...rest] = session.queue
  if (!q) throw new Error('session is finished')
  const correct = choiceId === q.answer
  return {
    correct,
    session: {
      ...session,
      firstTry: q.retry ? session.firstTry : { ...session.firstTry, [q.subjectId]: correct },
      queue: correct || q.retry ? rest : [...rest, { ...q, retry: true }],
    },
  }
}

/** Score a finished session on the lesson's own items (review is excluded). Save `progress`
    (changed records only) to users/{uid}/progress/{characterId} and `result` to
    users/{uid}/lessonResults/{lessonId}. */
export function finishSession(
  content: Content,
  session: Session,
  progress: Progress,
  previous: LessonResult | undefined,
  now = Date.now(),
): { score: number; passed: boolean; progress: Progress; result: LessonResult } {
  if (session.queue.length) throw new Error('session still has questions')
  const lesson = content.lessons.find((l) => l.id === session.lessonId)
  if (!lesson) throw new Error(`unknown lesson ${session.lessonId}`)
  const own = new Set([...lesson.characterIds, ...lesson.vocabulary.map((v) => v.id)])
  const scored = Object.entries(session.firstTry).filter(([id]) => own.has(id))
  if (!scored.length) throw new Error('session has no answers to score')

  const score = scored.filter(([, ok]) => ok).length / scored.length
  const updated: Progress = {}
  for (const [id, ok] of Object.entries(session.firstTry)) {
    if (!content.characters[id]) continue // vocabulary: scored, not tracked per item
    const r = progress[id] ?? { attempts: 0, correct: 0, streak: 0, lastSeen: 0 }
    updated[id] = { attempts: r.attempts + 1, correct: r.correct + (ok ? 1 : 0), streak: ok ? r.streak + 1 : 0, lastSeen: now }
  }
  return {
    score,
    passed: score >= PASS_SCORE,
    progress: updated,
    result: { bestScore: Math.max(score, previous?.bestScore ?? 0), attempts: (previous?.attempts ?? 0) + 1, lastPlayed: now },
  }
}

/** Guided mode: a lesson is complete once a session scores PASS_SCORE; the next one then unlocks.
    Freeform mode can ignore 'locked'. */
export function lessonStatuses(content: Content, results: LessonResults): Record<string, LessonStatus> {
  const out: Record<string, LessonStatus> = {}
  let prevComplete = true
  for (const l of content.lessons) {
    const complete = (results[l.id]?.bestScore ?? 0) >= PASS_SCORE
    out[l.id] = complete ? 'complete' : prevComplete ? 'available' : 'locked'
    prevComplete = complete
  }
  return out
}
