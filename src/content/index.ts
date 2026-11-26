import familiesJson from './families.json' with { type: 'json' }
import lessonsJson from './lessons.json' with { type: 'json' }
import contrastsJson from './contrasts.json' with { type: 'json' }
import audioJson from './audio.json' with { type: 'json' }

/* Content is authored in the JSON files next to this one (see README.md),
   validated and expanded here, then seeded to Firestore by scripts/seed.ts.
   The same build feeds the terminal playthrough and the tests. */

// BGN/PCGN 1967 vowels per order (index 0–6). The 6th order is written as the bare consonant
// (the table allows with or without i). Rows that differ set `first` / `sixth` in families.json.
// TODO(content): order names (ግእዝ … ሣብዕ) left out until spelling is confirmed against Leslau.
export const VOWELS = ['e', 'u', 'ī', 'a', 'ē', '', 'o'] as const

export interface Character {
  id: string // the fidel itself, e.g. 'ሁ' — also the Firestore doc ID
  family: string // first-order character of its row in the fidel gebeta, e.g. 'ሀ'
  familyIndex: number // row in the gebeta, 0-based
  order: number // 0–6
  romanization: string
  audioUrl: string | null
  contrastFamilies: string[] // rows that look or sound like this one (from contrasts.json), e.g. ሀ → ሐ ኀ ኸ
}

export interface VocabularyItem {
  id: string // `${lessonId}-${n}`, generated
  english: string
  amharic: string
  transliteration: string // as authored in Notion; not BGN/PCGN
  audience?: 'm' | 'f' | 'group' // who you say it to, when the form changes
  note?: string
}

export interface Lesson {
  id: string
  index: number // 0-based position in the course
  title: string
  kind: 'fidel' | 'vocabulary'
  characterIds: string[] // fidel lessons
  vocabulary: VocabularyItem[] // vocabulary lessons
}

export interface Content {
  characters: Record<string, Character>
  lessons: Lesson[]
}

interface RawFamily {
  id: string
  consonant: string
  first?: string
  sixth?: string
}
interface RawLesson {
  id: string
  title: string
  kind: string
  families?: string[]
  orders?: number[] // 1–7 as learners count them; defaults to all seven
  vocabulary?: Omit<VocabularyItem, 'id'>[]
}

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

export function buildContent(
  families: RawFamily[],
  rawLessons: RawLesson[],
  contrastSets: string[][],
  audio: Record<string, string>,
): Content {
  const fail: (msg: string) => never = (msg) => {
    throw new Error(`content: ${msg}`)
  }

  const familyIds = new Set<string>()
  for (const f of families) {
    if (!isText(f.id) || [...f.id].length !== 1) fail(`family id must be one fidel, got ${JSON.stringify(f.id)}`)
    if (familyIds.has(f.id)) fail(`duplicate family ${f.id}`)
    if (typeof f.consonant !== 'string') fail(`family ${f.id} needs a consonant string`)
    familyIds.add(f.id)
  }
  for (const set of contrastSets)
    for (const f of set) if (!familyIds.has(f)) fail(`contrast set uses unknown family ${f}`)

  const characters: Record<string, Character> = {}
  families.forEach((fam, familyIndex) => {
    // Ethiopic Unicode lays each of these 33 rows out as 7 consecutive code points, orders 0–6.
    const base = fam.id.codePointAt(0)!
    const romanize = (order: number) =>
      (order === 0 && fam.first) || (order === 5 && fam.sixth) || fam.consonant + VOWELS[order]
    const contrastFamilies = [...new Set(contrastSets.filter((s) => s.includes(fam.id)).flat())].filter((f) => f !== fam.id)
    VOWELS.forEach((_, order) => {
      const id = String.fromCodePoint(base + order)
      characters[id] = {
        id,
        family: fam.id,
        familyIndex,
        order,
        romanization: romanize(order),
        audioUrl: audio[id] ?? null,
        contrastFamilies,
      }
    })
  })

  const taught = new Set<string>()
  const lessonIds = new Set<string>()
  const lessons = rawLessons.map((l, index): Lesson => {
    if (!isText(l.id) || lessonIds.has(l.id)) fail(`lesson id missing or duplicate: ${JSON.stringify(l.id)}`)
    lessonIds.add(l.id)
    if (!isText(l.title)) fail(`${l.id} needs a title`)
    if (l.kind !== 'fidel' && l.kind !== 'vocabulary') fail(`${l.id} has unknown kind ${l.kind}`)
    if (l.kind === 'fidel' && l.vocabulary) fail(`${l.id} is a fidel lesson but has vocabulary`)
    if (l.kind === 'vocabulary' && (l.families || l.orders)) fail(`${l.id} is a vocabulary lesson but has families/orders`)

    const orders = l.orders ?? [1, 2, 3, 4, 5, 6, 7]
    if (orders.some((o) => !Number.isInteger(o) || o < 1 || o > 7)) fail(`${l.id} orders must be 1–7`)
    if (new Set(orders).size !== orders.length) fail(`${l.id} repeats an order`)
    const characterIds: string[] = []
    for (const f of l.families ?? []) {
      if (!familyIds.has(f)) fail(`${l.id} uses unknown family ${f}`)
      for (const o of orders) {
        const id = String.fromCodePoint(f.codePointAt(0)! + o - 1)
        if (taught.has(id)) fail(`${id} is taught in more than one lesson`)
        taught.add(id)
        characterIds.push(id)
      }
    }

    const vocabulary = (l.vocabulary ?? []).map((v, i) => {
      const where = `${l.id} vocabulary #${i + 1}`
      for (const key of ['english', 'amharic', 'transliteration'] as const) if (!isText(v[key])) fail(`${where} needs ${key}`)
      if (v.audience !== undefined && !['m', 'f', 'group'].includes(v.audience)) fail(`${where} has bad audience ${v.audience}`)
      return { ...v, id: `${l.id}-${i + 1}` }
    })
    if (l.kind === 'fidel' ? !characterIds.length : !vocabulary.length) fail(`${l.id} is empty`)
    return { id: l.id, index, title: l.title, kind: l.kind, characterIds, vocabulary }
  })

  return { characters, lessons }
}

export const content = buildContent(familiesJson, lessonsJson as RawLesson[], contrastsJson, audioJson)
