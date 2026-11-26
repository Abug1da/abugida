import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Tibeb from '../components/Tibeb'

/* Landing rules, from the design language:
   1. Fidel as texture — recognisably Ethiopian before it is legible.
   2. Tibeb as structure — section breaks are woven bands, not hairlines.
   3. Netela rule — the field stays cream; colour lives in the bands. */

const HA_ROW = [
  { char: 'ሀ', rom: 'hä', order: 'ግዕዝ' },
  { char: 'ሁ', rom: 'hu', order: 'ካዕብ' },
  { char: 'ሂ', rom: 'hi', order: 'ሣልስ' },
  { char: 'ሃ', rom: 'ha', order: 'ራብዕ' },
  { char: 'ሄ', rom: 'hē', order: 'ኃምስ' },
  { char: 'ህ', rom: 'hə', order: 'ሳድስ' },
  { char: 'ሆ', rom: 'ho', order: 'ሳብዕ' },
]

const OFFERINGS = [
  {
    numeral: '፩',
    title: 'Learn the fidel',
    body: 'Thirty-three consonants turned through seven vowels. Learn the turning once and the whole script opens at the same time.',
  },
  {
    numeral: '፪',
    title: 'Speak Amharic',
    body: 'Short lessons built around real phrases — greetings, the market, the coffee ceremony — with audio from native speakers.',
  },
  {
    numeral: '፫',
    title: 'Meet the culture',
    body: 'The script is a doorway. Behind it: three thousand years of history, food, music, and faith. The archive grows with every lesson.',
  },
]

export default function Landing() {
  const { user } = useAuth()
  const startTo = user ? '/lessons' : '/signup'

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-5xl gap-10 px-4 pt-14 pb-16 md:grid-cols-[1fr_15ch]">
        <div>
          <p className="fidel text-sm tracking-wide text-ink-muted">
            ክፍል ፩ ። መጀመሪያ ቃል
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-6">
            <h1 className="fidel text-7xl leading-none font-normal text-ink-strong sm:text-8xl md:text-9xl">
              <span className="text-brand">ሰ</span>ላም
            </h1>
            <div className="pb-2">
              <p className="font-mono text-base text-saffron-500">säl·am</p>
              <p className="mt-1 text-sm text-ink-muted">peace · hello</p>
            </div>
          </div>

          <p className="mt-7 max-w-[46ch] text-lg leading-relaxed text-ink">
            Four characters, and you have read your first Amharic word. The
            fidel is not an alphabet to memorise letter by letter — it is a
            table of thirty-three sounds turned through seven vowels, and
            learning the turning teaches you all of it at once.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to={startTo}
              className="rounded-md bg-brand px-6 py-3 font-semibold text-clay-50 shadow-sm transition-colors hover:bg-brand-hover active:bg-brand-press"
            >
              Begin the table
            </Link>
            <Link
              to="/lessons"
              className="rounded-md px-6 py-3 font-semibold text-ink transition-colors hover:bg-surface-sunken"
            >
              Browse lessons
            </Link>
          </div>
        </div>

        {/* Scribe's margin — rubricated gloss, as in the codex */}
        <aside className="hidden border-l border-clay-300 pl-5 md:block">
          <p className="fidel text-sm leading-relaxed text-brand">
            ሰላም ማለት
            <br />
            ሰላምታ ነው።
          </p>
          <p className="mt-4 text-xs leading-relaxed text-ink-muted">
            The greeting and the word for peace are the same word. Ethiopians
            say it as both.
          </p>
          <p className="fidel mt-5 text-xl text-saffron-500" aria-hidden="true">
            ፨
          </p>
        </aside>
      </section>

      {/* ── The fidel table — the hero object ────────────────── */}
      <section className="mx-auto max-w-5xl px-4">
        <div className="overflow-hidden rounded-lg border border-clay-300 bg-surface-raised shadow-md">
          <Tibeb />
          <div className="overflow-x-auto p-6 sm:p-8">
            <div className="grid min-w-[36rem] grid-cols-[6ch_repeat(7,1fr)] items-end gap-2.5">
              <p className="pb-2 font-mono text-[10px] tracking-caps text-ink-muted uppercase">
                Order
              </p>
              {HA_ROW.map((o, i) => (
                <div key={o.order} className="pb-2 text-center">
                  <p className="fidel text-sm text-brand">{o.order}</p>
                  <p className="fidel mt-0.5 text-xs text-ink-muted">
                    {'፩፪፫፬፭፮፯'[i]}
                  </p>
                </div>
              ))}

              <p className="fidel self-center text-3xl text-saffron-500">ሀ</p>
              {HA_ROW.map((o) => (
                <div
                  key={o.char}
                  className="rounded-sm border border-clay-200 bg-surface-page py-4 text-center"
                >
                  <p className="fidel text-3xl leading-none text-ink-strong">
                    {o.char}
                  </p>
                  <p className="mt-2 font-mono text-xs text-ink-muted">
                    {o.rom}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-5 max-w-[62ch] text-sm leading-relaxed text-ink-muted">
              One consonant, seven vowel orders. Thirty-three of these rows
              make the whole script — and the shape of the turn is the same in
              every row<span className="fidel">።</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Three offerings, numbered as chapters ────────────── */}
      <section className="mx-auto grid max-w-5xl gap-10 px-4 py-16 md:grid-cols-3">
        {OFFERINGS.map((o) => (
          <div key={o.title}>
            <p className="fidel text-3xl text-saffron-500" aria-hidden="true">
              {o.numeral}
            </p>
            <h2 className="mt-3 text-xl">{o.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {o.body}
            </p>
          </div>
        ))}
      </section>

      {/* ── Closing call ─────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="overflow-hidden rounded-xl bg-surface-inverse shadow-lg">
          <div className="flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <p className="fidel text-2xl text-saffron-400">እንኳን ደህና መጣህ</p>
              <p className="mt-2 max-w-[40ch] text-sm leading-relaxed text-clay-300">
                Welcome. Start with one row of the table today — the rest
                follows the same turn.
              </p>
            </div>
            <Link
              to={startTo}
              className="shrink-0 rounded-md bg-brand px-6 py-3 font-semibold text-clay-50 shadow-sm transition-colors hover:bg-brand-hover"
            >
              Start learning
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
