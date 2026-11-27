import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextPublishedLessonId, OPTION_COUNT, validateCourse, type Content } from './content.ts'
import { createSession, finishSession, lessonStatuses, submit, type Session } from './engine.ts'
import { seedContent } from './seed/index.ts'

function seeded(seed: number) {
  return () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
}

const answerAll = (s: Session, right: (subjectId: string) => boolean) => {
  while (s.queue.length) {
    const q = s.queue[0]
    s = submit(s, right(q.subjectId) ? q.answer : q.options.find((id) => id !== q.answer)!).session
  }
  return s
}

const content = seedContent()
const ch = content.characters
const clone = (c: Content): Content => structuredClone(c)

test('seed: 231 characters, BGN/PCGN romanization, each taught once, 6th order held back', () => {
  assert.equal(Object.keys(ch).length, 231)
  const taught = content.lessons.flatMap((l) => l.characterIds)
  assert.deepEqual([...taught].sort(), Object.keys(ch).sort())
  const sixth = content.lessons.find((l) => l.characterIds.some((id) => ch[id].order === 6))!
  assert.ok(sixth.characterIds.every((id) => ch[id].order === 6))
  const rom = (s: string) => [...s].map((c) => ch[c].romanization).join(' ')
  assert.equal(rom('ለሉሊላሌልሎ'), 'le lu lī la lē l lo')
  assert.equal(rom('ሀሐኀኸ'), 'hā hā hā he')
  assert.equal(rom('አእዐዕ'), 'ā i ‘ā ‘i')
  assert.equal(rom('ቀጠ'), 'k’e t’e')
  assert.deepEqual(ch['ሑ'].contrastFamilies.sort(), ['ሀ', 'ኀ', 'ኸ'].sort())
  assert.deepEqual(validateCourse(content), [])
})

test('validateCourse: catches course-wide problems', () => {
  const dup = clone(content)
  dup.lessons[1].characterIds.push(dup.lessons[0].characterIds[0])
  assert.match(validateCourse(dup).join('\n'), /taught in both/)

  const empty = clone(content)
  empty.lessons[2].characterIds = []
  assert.match(validateCourse(empty).join('\n'), /teaches no characters/)

  // A romanization edit in lesson 1 can break it even though nobody opened the lesson.
  const same = clone(content)
  for (const id of same.lessons[0].characterIds) same.characters[id].romanization = 'x'
  assert.match(validateCourse(same).join('\n'), /needs at least 3 other sounds/)

  // Drafts don't count toward the pool, and aren't validated until published.
  const draft = clone(content)
  draft.lessons[0].status = 'draft'
  draft.lessons[0].characterIds = []
  assert.deepEqual(validateCourse(draft), [])
})

test('session: always 4 options, never two that sound or read the same; row match only among taught rows', () => {
  for (const lesson of content.lessons) {
    const known = new Set(
      content.lessons.filter((l) => l.position <= lesson.position).flatMap((l) => l.characterIds.map((id) => ch[id].family)),
    )
    for (let s = 1; s <= 20; s++) {
      for (const q of createSession(content, lesson, {}, seeded(s)).queue) {
        const labels = q.options.map((id) => (q.type === 'contrast' ? id : ch[id].romanization))
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

test('session: same-sound fidel get a row-match question, never an ambiguous sound prompt', () => {
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

test('session: drafts never supply distractors or review items', () => {
  const c = clone(content)
  c.lessons[1].status = 'draft'
  const draftChars = new Set(c.lessons[1].characterIds)
  for (let s = 1; s <= 10; s++)
    for (const q of createSession(c, c.lessons[3], {}, seeded(s)).queue) {
      assert.ok(!draftChars.has(q.subjectId), `review used draft character ${q.subjectId}`)
      if (q.type !== 'contrast') for (const o of q.options) assert.ok(!draftChars.has(o), `distractor from draft: ${o}`)
    }
})

test('flow: miss re-asked once; score counts only the lesson’s own characters; a pass completes it', () => {
  const [l1, l2, l3] = content.lessons
  let session = createSession(content, l1, {}, seeded(1))
  const size = session.queue.length
  const missed = session.queue[0].subjectId
  session = submit(session, session.queue[0].options.find((id) => id !== session.queue[0].answer)!).session
  assert.equal(session.queue.length, size) // pushed to the back
  assert.throws(() => finishSession(session, {}), /still has questions/)
  session = answerAll(session, () => true)
  const done = finishSession(session, {}, 1)
  assert.equal(done.score, (size - 1) / size)
  assert.equal(done.progress[missed].streak, 0)
  assert.equal(lessonStatuses(content, new Set())[l2.id], 'locked')
  assert.equal(lessonStatuses(content, new Set([l1.id]))[l2.id], 'available')

  // Lesson 3 reviews lesson 1–2 characters; missing every review item must not fail the lesson.
  const s3 = answerAll(createSession(content, l3, {}, seeded(5)), (id) => l3.characterIds.includes(id))
  assert.ok(Object.keys(s3.firstTry).some((id) => !l3.characterIds.includes(id)), 'has review items')
  const d3 = finishSession(s3, {})
  assert.equal(d3.score, 1)
  assert.ok(Object.values(d3.progress).some((r) => r.streak === 0), 'review misses still recorded')

  const failed = finishSession(answerAll(createSession(content, l1, {}, seeded(2)), () => false), {})
  assert.equal(failed.passed, false)
})

test('nextPublishedLessonId: skips drafts, null for the last lesson or an unpublished one', () => {
  const c = clone(content)
  c.lessons[1].status = 'draft'
  assert.equal(nextPublishedLessonId(c, c.lessons[0].id), c.lessons[2].id)
  assert.equal(nextPublishedLessonId(c, c.lessons[1].id), null) // not lesson 1 again
  assert.equal(nextPublishedLessonId(c, c.lessons.at(-1)!.id), null)
})

test('flow: grading uses the lesson as it was when the session started', () => {
  const c = clone(content)
  const session = answerAll(createSession(c, c.lessons[0], {}, seeded(3)), () => true)
  c.lessons[0].characterIds = c.lessons[0].characterIds.slice(0, 1) // edited mid-session
  assert.equal(finishSession(session, {}).score, 1)
})
