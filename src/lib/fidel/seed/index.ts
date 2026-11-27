import families from './families.json' with { type: 'json' }
import contrasts from './contrasts.json' with { type: 'json' }
import audio from './audio.json' with { type: 'json' }
import lessons from './lessons.json' with { type: 'json' }
import { buildCharacters, characterAt, type Content, type Lesson, type SeedFamily } from '../content.ts'

/* The starting course, carried over from the content-engine branch: 33 gebeta rows, BGN/PCGN
   romanizations, legacy audio, and the nine Fidel lessons agreed in September (sound-class
   batches, the 6th order held back to its own lesson). scripts/seed.ts writes it to the database
   once; after that the database is the source of truth and Daniel edits it in /admin. */

export interface SeedLesson {
  id: string
  title: string
  families: string[]
  orders?: number[] // 1–7; all seven when omitted
}

export const seedFamilies = families as SeedFamily[]
export const seedContrasts = contrasts as string[][]

export function seedContent(): Content {
  const characters = buildCharacters(seedFamilies, seedContrasts, audio as Record<string, string>)
  const out: Lesson[] = (lessons as SeedLesson[]).map((l, position) => ({
    id: l.id,
    position,
    title: l.title,
    status: 'published',
    characterIds: l.families.flatMap((f) => (l.orders ?? [1, 2, 3, 4, 5, 6, 7]).map((o) => characterAt(f, o))),
  }))
  return { characters, lessons: out }
}
