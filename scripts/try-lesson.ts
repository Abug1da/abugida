/* Play a lesson in the terminal to feel the flow before any UI exists.
   Progress is kept in .abugida-progress.json so repeat runs unlock lessons and pick review items.

   npm run try-lesson            first unfinished lesson
   npm run try-lesson -- 3       lesson 3
   npm run try-lesson -- --audio play pronunciations (macOS afplay)
   npm run try-lesson -- --reset wipe local progress */
import fs from 'node:fs'
import { execFile } from 'node:child_process'
import { createInterface } from 'node:readline'
import { content, type VocabularyItem } from '../src/content/index.ts'
import {
  createSession,
  finishSession,
  lessonStatuses,
  submit,
  vocabLabel,
  PASS_SCORE,
  type LessonResults,
  type Progress,
  type Question,
} from '../src/lessons/engine.ts'

const FILE = '.abugida-progress.json'
const args = process.argv.slice(2)
const audio = args.includes('--audio') && process.platform === 'darwin'
if (args.includes('--reset')) fs.rmSync(FILE, { force: true })
const saved: { progress?: Progress; results?: LessonResults } = fs.existsSync(FILE)
  ? JSON.parse(fs.readFileSync(FILE, 'utf8'))
  : {}
const progress = saved.progress ?? {}
const results = saved.results ?? {}

const statuses = lessonStatuses(content, results)
const n = Number(args.find((a) => /^\d+$/.test(a)))
const lesson = n
  ? content.lessons[n - 1]
  : content.lessons.find((l) => statuses[l.id] !== 'complete') ?? content.lessons[0]
if (!lesson) throw new Error(`no lesson ${n} (there are ${content.lessons.length})`)

const ch = (id: string) => content.characters[id]
const vocab: Record<string, VocabularyItem> = Object.fromEntries(
  content.lessons.flatMap((l) => l.vocabulary).map((v) => [v.id, v]),
)
const play = (id: string) => {
  const url = ch(id)?.audioUrl
  if (audio && url) execFile('sh', ['-c', 'curl -sL "$0" -o /tmp/abugida.mp3 && afplay /tmp/abugida.mp3', url])
}
const lines = createInterface({ input: process.stdin })[Symbol.asyncIterator]()
async function prompt(text: string): Promise<string> {
  process.stdout.write(text)
  const line = await lines.next()
  if (line.done) process.exit(0)
  return line.value
}

console.log(`\nLesson ${lesson.index + 1} of ${content.lessons.length} (${statuses[lesson.id]}) — ${lesson.title}\n`)
if (statuses[lesson.id] === 'locked') console.log('(locked in guided mode — the previous lesson is not passed yet)\n')

if (lesson.kind === 'fidel') {
  console.log('ፊደል ገበታ — today:\n')
  const families = new Set(lesson.characterIds.map((id) => ch(id).family)).size
  const perRow = families === lesson.characterIds.length ? 11 : lesson.characterIds.length / families
  for (let i = 0; i < lesson.characterIds.length; i += perRow) {
    const row = lesson.characterIds.slice(i, i + perRow).map(ch)
    console.log('  ' + row.map((c) => c.id.padEnd(6)).join(''))
    console.log('  ' + row.map((c) => c.romanization.padEnd(6)).join('') + '\n')
  }
} else {
  for (const v of lesson.vocabulary) {
    console.log(`  ${v.amharic}\n     ${v.transliteration} — ${vocabLabel(v)}${v.note ? `\n     ${v.note}` : ''}\n`)
  }
}
await prompt('Enter to start… ')

function ask(q: Question): string {
  if (q.type === 'meaning') return `What does  ${vocab[q.subjectId].amharic}  mean?`
  const c = ch(q.subjectId)
  if (q.type === 'recognize') return `What sound is  ${c.id}  ?`
  if (q.type === 'contrast') return `Look closely — which row of the gebeta is  ${c.id}  from?`
  return `Which fidel is "${c.romanization}"?`
}
function show(q: Question, id: string): string {
  if (q.type === 'meaning') return vocabLabel(vocab[id])
  if (q.type === 'contrast') return `${id} row`
  return q.type === 'recognize' ? ch(id).romanization : id
}
function reveal(q: Question): string {
  if (q.type === 'meaning') return `${vocab[q.subjectId].amharic} = ${vocabLabel(vocab[q.subjectId])}`
  const c = ch(q.subjectId)
  return q.type === 'contrast' ? `${c.id} is in the ${c.family} row` : `${c.id} is "${c.romanization}"`
}

let session = createSession(content, lesson, progress)
const total = session.queue.length
while (session.queue.length) {
  const q = session.queue[0]
  const counter = q.retry ? 'again' : `${Object.keys(session.firstTry).length + 1}/${total}`
  console.log(`\n[${counter}] ${ask(q)}`)
  if (q.type === 'produce') play(q.subjectId)
  q.options.forEach((id, i) => console.log(`   ${i + 1}) ${show(q, id)}`))
  let pick = NaN
  while (!(pick >= 1 && pick <= q.options.length)) pick = Number(await prompt('> '))
  const result = submit(session, q.options[pick - 1])
  session = result.session
  console.log(result.correct ? '   correct' : `   not quite — ${reveal(q)}${q.retry ? '' : ', it will come back'}`)
  if (q.type !== 'produce' && q.type !== 'meaning') play(q.subjectId)
}

const done = finishSession(content, session, progress, results[lesson.id])
Object.assign(progress, done.progress)
results[lesson.id] = done.result
fs.writeFileSync(FILE, JSON.stringify({ progress, results }, null, 2))

console.log(`\nScore: ${Math.round(done.score * 100)}% — ${done.passed ? 'passed' : `need ${PASS_SCORE * 100}% to pass`}.`)
const after = lessonStatuses(content, results)
console.log(content.lessons.map((l) => `  ${l.index + 1}. ${l.title}  ${after[l.id]}`).join('\n'))
