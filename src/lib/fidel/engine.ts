import { earlierPublished, OPTION_COUNT, type Character, type Content, type Lesson } from './content.ts'

/* Quiz engine, ported from the content-engine branch: pure functions, no database, no React.
   Flow: createSession → submit() per answer until the queue is empty → finishSession().
   Orders count 1–7 here (the old engine used 0–6).

   recognize: show the fidel, pick its sound.
   produce:   give the sound, pick the fidel. Skipped for sounds shared by several fidel (ሀ/ሐ/ኀ/ኸ).
   contrast:  show the fidel, pick which gebeta row it belongs to, among look-alike and
              same-sound rows (ሑ → ሀ ሐ ኀ ኸ). */
export type QuestionType = 'recognize' | 'produce' | 'contrast'

export interface Question {
  type: QuestionType
  subjectId: string // the character being tested; progress is keyed by it
  answer: string // ID of the correct option (for contrast: the row's first-order fidel)
  options: string[] // character IDs
  retry: boolean
}

export interface Session {
  lessonId: string
  lessonCharacterIds: string[] // as of the start, so a mid-session lesson edit can't change grading
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
export type LessonStatus = 'locked' | 'available' | 'complete'

export const REVIEW_COUNT = 5
export const MASTERY_STREAK = 2 // only used to pick review items
export const PASS_SCORE = 0.7

const TYPES: QuestionType[] = ['recognize', 'produce', 'contrast']

export const isMastered = (r?: ProgressRecord) => (r?.streak ?? 0) >= MASTERY_STREAK

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Fill options from candidate tiers in turn, never repeating a label: homophones (ሀ/ሐ/ኀ) would
    otherwise give two right answers. Throws rather than return a broken quiz;
    validateCourse() keeps published lessons from getting here. */
function pickOptions(target: Character, label: (c: Character) => string, tiers: Character[][], rand: () => number) {
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

function question(content: Content, target: Character, preferred: QuestionType, pool: Character[], rand: () => number): Question {
  const all = Object.values(content.characters)
  const knownFamilies = new Set(pool.map((c) => c.family))
  const knownHeads = all.filter((c) => c.order === 1 && knownFamilies.has(c.id))
  // Row match needs a learned look-alike row, four learned rows to choose from, and a subject
  // that isn't the row head itself ("which row is ጠ from?" answers itself).
  const canContrast =
    target.order !== 1 && knownHeads.length >= OPTION_COUNT && target.contrastFamilies.some((f) => knownFamilies.has(f))
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

/** A session for `lesson`, drawing distractors and review from published lessons up to it.
    Review items (weakest earlier characters) count toward progress, not the lesson score. */
export function createSession(content: Content, lesson: Lesson, progress: Progress, rand: () => number = Math.random): Session {
  const pool = earlierPublished(content, lesson)
    .flatMap((l) => l.characterIds)
    .concat(lesson.status === 'published' ? [] : lesson.characterIds) // previewing a draft
    .map((id) => content.characters[id])
  const own = shuffle(lesson.characterIds.map((id) => content.characters[id]), rand)
  const questions = own.map((c, i) => question(content, c, TYPES[i % TYPES.length], pool, rand))
  const review = pool
    .filter((c) => !lesson.characterIds.includes(c.id))
    .map((c) => ({ c, r: progress[c.id] }))
    .sort((a, b) => Number(isMastered(a.r)) - Number(isMastered(b.r)) || (a.r?.lastSeen ?? 0) - (b.r?.lastSeen ?? 0))
    .slice(0, REVIEW_COUNT)
    .map(({ c }, i) => question(content, c, TYPES[i % TYPES.length], pool, rand))
  return {
    lessonId: lesson.id,
    lessonCharacterIds: [...lesson.characterIds],
    queue: shuffle([...questions, ...review], rand),
    firstTry: {},
  }
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

/** Score a finished session on the lesson's own characters (review is excluded) and return the
    progress records it changes. */
export function finishSession(session: Session, progress: Progress, now = Date.now()) {
  if (session.queue.length) throw new Error('session still has questions')
  const own = new Set(session.lessonCharacterIds)
  const scored = Object.entries(session.firstTry).filter(([id]) => own.has(id))
  if (!scored.length) throw new Error('session has no answers to score')
  const score = scored.filter(([, ok]) => ok).length / scored.length
  const updated: Progress = {}
  for (const [id, ok] of Object.entries(session.firstTry)) {
    const r = progress[id] ?? { attempts: 0, correct: 0, streak: 0, lastSeen: 0 }
    updated[id] = { attempts: r.attempts + 1, correct: r.correct + (ok ? 1 : 0), streak: ok ? r.streak + 1 : 0, lastSeen: now }
  }
  return { score, passed: score >= PASS_SCORE, progress: updated }
}

/** Guided mode over published lessons: complete once a Test has passed (completedAt is set), and
    the next lesson unlocks when the previous one is complete. */
export function lessonStatuses(content: Content, completed: Set<string>): Record<string, LessonStatus> {
  const out: Record<string, LessonStatus> = {}
  let prevComplete = true
  for (const l of content.lessons) {
    if (l.status !== 'published') continue
    const complete = completed.has(l.id)
    out[l.id] = complete ? 'complete' : prevComplete ? 'available' : 'locked'
    prevComplete = complete
  }
  return out
}
