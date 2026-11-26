/* Push src/content to Firestore: characters/{id} and lessons/{id}.
   `npm run seed` runs the tests first. If Firestore has docs no longer in the content files,
   it refuses to write anything unless --prune is passed (which deletes them).

   Production: GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json npm run seed
   Emulator:   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed */
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { content } from '../src/content/index.ts'

const PROJECT = 'abugidaauth'
const prune = process.argv.includes('--prune')
const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator ${process.env.FIRESTORE_EMULATOR_HOST}` : 'PRODUCTION'
console.log(`seeding project ${PROJECT} (${target})${prune ? ', pruning stale docs' : ''}`)

const db = getFirestore(initializeApp({ projectId: PROJECT }))
const writer = db.bulkWriter()
// close() does not reject on individual write failures, so catch each op as it is queued
// (an unhandled early rejection would kill Node before the summary prints).
const failures: unknown[] = []
let total = 0
const track = (op: Promise<unknown>) => {
  total++
  op.catch((e) => failures.push(e))
}

const docs = {
  characters: Object.values(content.characters),
  lessons: content.lessons,
}
// Check every collection before writing anything.
const plan = await Promise.all(
  Object.entries(docs).map(async ([name, items]) => {
    const col = db.collection(name)
    const keep = new Set(items.map((i) => i.id))
    const stale = (await col.listDocuments()).filter((ref) => !keep.has(ref.id))
    return { name, col, items, stale }
  }),
)
const stale = plan.filter((p) => p.stale.length)
if (stale.length && !prune) {
  // The app loads every lesson doc, so leftovers would stay live — refuse rather than half-sync.
  for (const p of stale) console.error(`${p.name}: no longer in the repo — ${p.stale.map((r) => r.id).join(' ')}`)
  console.error('nothing written; rerun with --prune to delete them')
  process.exit(1)
}
for (const { col, items, stale } of plan) {
  for (const ref of stale) track(writer.delete(ref))
  for (const item of items) track(writer.set(col.doc(item.id), item))
}
await writer.close()
if (failures.length) {
  for (const f of failures) console.error(f)
  console.error(`${failures.length} of ${total} writes failed`)
  process.exit(1)
}
console.log(`seeded ${docs.characters.length} characters, ${docs.lessons.length} lessons`)
