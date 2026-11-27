/* Fidel course content as the quiz engine sees it, plus the pieces the seed script and the
   admin share: building the 231 characters from the seed JSON, and validating the course.
   Pure TypeScript: no database, no React. */

export interface Character {
  id: string // the fidel itself, e.g. ሁ
  family: string // first-order fidel of its row in the ፊደል ገበታ, e.g. ሀ
  familyPosition: number // row in the gebeta, 0-based
  order: number // 1–7, as learners count
  romanization: string
  audioUrl: string | null
  contrastFamilies: string[] // look-alike or same-sound rows, e.g. ሀ → ሐ ኀ ኸ
}

export interface Lesson {
  id: string
  position: number
  title: string
  status: 'draft' | 'published'
  characterIds: string[]
}

export interface Content {
  characters: Record<string, Character>
  lessons: Lesson[] // sorted by position
}

export interface SeedFamily {
  id: string
  consonant: string
  first?: string // romanization of the 1st order when it breaks the pattern (ሀ → hā)
  sixth?: string // romanization of the 6th order when it breaks the pattern (አ → i)
}

// BGN/PCGN 1967 vowels for orders 1–7. The 6th order is the bare consonant (the table allows
// with or without i). Romanizations live in the database after seeding, so switching notation
// later is a data edit, not a code change.
const VOWELS = ['e', 'u', 'ī', 'a', 'ē', '', 'o'] as const

/** Ethiopic Unicode lays out each gebeta row as 7 consecutive code points, 1st order first. */
export const characterAt = (family: string, order: number) => String.fromCodePoint(family.codePointAt(0)! + order - 1)

export function buildCharacters(
  families: SeedFamily[],
  contrastSets: string[][],
  audio: Record<string, string>,
): Record<string, Character> {
  const characters: Record<string, Character> = {}
  families.forEach((fam, familyPosition) => {
    const contrastFamilies = [...new Set(contrastSets.filter((s) => s.includes(fam.id)).flat())].filter((f) => f !== fam.id)
    for (let order = 1; order <= 7; order++) {
      const id = characterAt(fam.id, order)
      const romanization = (order === 1 && fam.first) || (order === 6 && fam.sixth) || fam.consonant + VOWELS[order - 1]
      characters[id] = { id, family: fam.id, familyPosition, order, romanization, audioUrl: audio[id] ?? null, contrastFamilies }
    }
  })
  return characters
}

export const OPTION_COUNT = 4

/** Lessons whose characters a learner of `lesson` has seen: published ones up to and including it. */
export const earlierPublished = (content: Content, lesson: Lesson) =>
  content.lessons.filter((l) => l.status === 'published' && l.position <= lesson.position)

/** The published lesson after `lessonId`, or null when it's the last one or isn't published. */
export function nextPublishedLessonId(content: Content, lessonId: string): string | null {
  const published = content.lessons.filter((l) => l.status === 'published')
  const i = published.findIndex((l) => l.id === lessonId)
  return i >= 0 ? (published[i + 1]?.id ?? null) : null
}

/** Problems that would break learners, as readable sentences for the admin. Empty means fine.
    Checks the whole published course, because a change to one lesson or one romanization can
    break a lesson nobody touched. */
export function validateCourse(content: Content): string[] {
  const problems: string[] = []
  const owner = new Map<string, string>()
  for (const lesson of content.lessons) {
    for (const id of lesson.characterIds) {
      if (!content.characters[id]) problems.push(`${lesson.title}: unknown character ${id}`)
      const other = owner.get(id)
      if (other) problems.push(`${id} is taught in both “${other}” and “${lesson.title}”`)
      owner.set(id, lesson.title)
    }
  }
  for (const lesson of content.lessons) {
    if (lesson.status !== 'published') continue
    if (!lesson.characterIds.length) {
      problems.push(`“${lesson.title}” is published but teaches no characters`)
      continue
    }
    // Every question needs three wrong options that read differently from the right one, drawn
    // from characters the learner has seen (the engine's pool).
    const pool = earlierPublished(content, lesson).flatMap((l) => l.characterIds.map((id) => content.characters[id]))
    const readings = new Set(pool.map((c) => c?.romanization))
    for (const id of lesson.characterIds) {
      const c = content.characters[id]
      if (!c) continue
      const others = [...readings].filter((r) => r !== c.romanization).length
      if (others < OPTION_COUNT - 1) {
        problems.push(`“${lesson.title}”: ${id} needs at least ${OPTION_COUNT - 1} other sounds to choose from by this lesson`)
        break
      }
    }
  }
  return problems
}
