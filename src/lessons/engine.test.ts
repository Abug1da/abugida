import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildContent, content } from '../content/index.ts'
import {
  createSession,
  finishSession,
  lessonStatuses,
  submit,
  vocabLabel,
  OPTION_COUNT,
  type Session,
} from './engine.ts'

function seeded(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
}

const answerAll = (s: Session, right: (subjectId: string) => boolean) => {
  while (s.queue.length) {
    const q = s.queue[0]
    s = submit(s, right(q.subjectId) ? q.answer : q.options.find((id) => id !== q.answer)!).session
  }
  return s
}
const ch = content.characters
const vocab = content.lessons.flatMap((l) => l.vocabulary)

test('content: BGN/PCGN romanization, every character taught once, 6th order held back', () => {
  assert.equal(Object.keys(ch).length, 231)
  const taught = content.lessons.flatMap((l) => l.characterIds)
  assert.deepEqual([...taught].sort(), Object.keys(ch).sort())
  const sixth = content.lessons.find((l) => l.characterIds.some((id) => ch[id].order === 5))!
  assert.ok(sixth.characterIds.every((id) => ch[id].order === 5))
  const rom = (s: string) => [...s].map((c) => ch[c].romanization).join(' ')
  assert.equal(rom('ለሉሊላሌልሎ'), 'le lu lī la lē l lo')
  assert.equal(rom('ሀሐኀኸ'), 'hā hā hā he')
  assert.equal(rom('አእዐዕ'), 'ā i ‘ā ‘i')
  assert.equal(rom('ቀጠ'), 'k’e t’e')
  assert.deepEqual(ch['ሑ'].contrastFamilies.sort(), ['ሀ', 'ኀ', 'ኸ'].sort())
})

test('content: validation rejects broken JSON edits', () => {
  const fam = [{ id: 'ሀ', consonant: 'h' }]
  const bad: [string, () => unknown][] = [
    ['duplicate family', () => buildContent([...fam, ...fam], [], [], {})],
    ['unknown family', () => buildContent(fam, [{ id: 'a', title: 't', kind: 'fidel', families: ['ለ'] }], [], {})],
    ['repeated order', () => buildContent(fam, [{ id: 'a', title: 't', kind: 'fidel', families: ['ሀ'], orders: [1, 1] }], [], {})],
    ['mixed kind', () => buildContent(fam, [{ id: 'a', title: 't', kind: 'fidel', families: ['ሀ'], vocabulary: [] }], [], {})],
    ['missing vocab field', () => buildContent(fam, [{ id: 'a', title: 't', kind: 'vocabulary', vocabulary: [{ english: 'x', amharic: '', transliteration: 'y' }] }], [], {})],
    ['duplicate lesson', () => buildContent(fam, [{ id: 'a', title: 't', kind: 'fidel', families: ['ሀ'], orders: [1] }, { id: 'a', title: 't', kind: 'fidel', families: ['ሀ'], orders: [2] }], [], {})],
  ]
  for (const [name, fn] of bad) assert.throws(fn, /^Error: content:/, name)
})

test('session: always 4 options, never two that sound or read the same; family match only among taught rows', () => {
  for (const lesson of content.lessons) {
    const known = new Set(
      content.lessons.filter((l) => l.index <= lesson.index).flatMap((l) => l.characterIds.map((id) => ch[id].family)),
    )
    for (let s = 1; s <= 20; s++) {
      for (const q of createSession(content, lesson, {}, seeded(s)).queue) {
        const labels = q.options.map((id) =>
          q.type === 'meaning' ? vocabLabel(vocab.find((v) => v.id === id)!) : q.type === 'contrast' ? id : ch[id].romanization,
        )
        assert.equal(new Set(labels).size, OPTION_COUNT, `${lesson.id} ${q.subjectId}: ${labels}`)
        assert.ok(q.options.includes(q.answer))
        if (q.type === 'contrast') {
          assert.notEqual(q.subjectId, q.answer, `${lesson.id}: "which row is ${q.subjectId} from?" answers itself`)
          for (const row of q.options) assert.ok(known.has(row), `${lesson.id}: offers untaught row ${row}`)
        }
      }
    }
  }
})

test('session: same-sound fidel get family-match contrast, never an ambiguous sound prompt', () => {
  const glottal = content.lessons.find((l) => l.characterIds.includes('ሐ'))!
  const qs = [1, 2, 3].flatMap((s) => createSession(content, glottal, {}, seeded(s)).queue)
  const contrast = qs.filter((q) => q.type === 'contrast')
  assert.ok(contrast.length > 0)
  for (const q of contrast) {
    assert.equal(q.answer, ch[q.subjectId].family)
    assert.ok(ch[q.subjectId].contrastFamilies.some((f) => q.options.includes(f)))
  }
  const ambiguous = (id: string) => Object.values(ch).some((c) => c.id !== id && c.romanization === ch[id].romanization)
  assert.ok(qs.every((q) => q.type !== 'produce' || !ambiguous(q.subjectId)))
})

test('engine: too few distinct options throws instead of a broken quiz', () => {
  const tiny = buildContent([{ id: 'ሀ', consonant: 'h' }], [
    { id: 'v', title: 't', kind: 'vocabulary', vocabulary: [{ english: 'a', amharic: 'ሀ', transliteration: 'ha' }] },
  ], [], {})
  assert.throws(() => createSession(tiny, tiny.lessons[0], {}), /not enough distinct options/)
})

test('flow: miss re-asked once; score counts only the lesson’s own items; 70% unlocks next', () => {
  const [l1, l2, l3] = content.lessons
  let session = createSession(content, l1, {}, seeded(1))
  const size = session.queue.length
  const missed = session.queue[0].subjectId
  session = submit(session, session.queue[0].options.find((id) => id !== session.queue[0].answer)!).session
  assert.equal(session.queue.length, size) // pushed to the back
  assert.throws(() => finishSession(content, session, {}, undefined), /still has questions/)
  session = answerAll(session, () => true)
  const done = finishSession(content, session, {}, undefined, 1)
  assert.equal(done.score, (size - 1) / size)
  assert.equal(done.progress[missed].streak, 0)
  assert.equal(lessonStatuses(content, {})[l2.id], 'locked')
  assert.equal(lessonStatuses(content, { [l1.id]: done.result })[l2.id], 'available')

  // Lesson 3 includes review of lesson 1–2 characters; missing all review must not fail the lesson.
  const s3 = answerAll(createSession(content, l3, {}, seeded(5)), (id) => l3.characterIds.includes(id))
  assert.ok(Object.keys(s3.firstTry).some((id) => !l3.characterIds.includes(id)), 'has review items')
  const d3 = finishSession(content, s3, {}, undefined)
  assert.equal(d3.score, 1)
  assert.ok(Object.values(d3.progress).some((r) => r.streak === 0), 'review misses still recorded')

  const failed = finishSession(content, answerAll(createSession(content, l1, {}, seeded(2)), () => false), {}, undefined)
  assert.equal(failed.passed, false)
  assert.equal(lessonStatuses(content, { [l1.id]: failed.result })[l2.id], 'locked')
})

test('vocabulary: meaning questions, scored but not written to character progress', () => {
  const lesson = content.lessons.find((l) => l.kind === 'vocabulary')!
  const session = answerAll(createSession(content, lesson, {}, seeded(4)), () => true)
  assert.equal(Object.keys(session.firstTry).length, lesson.vocabulary.length)
  const done = finishSession(content, session, {}, undefined)
  assert.equal(done.score, 1)
  assert.deepEqual(done.progress, {})
})
