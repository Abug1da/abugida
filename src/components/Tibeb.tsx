import { useId } from 'react'

/* Woven border band (tibeb), telet pattern — three equal sections:
   guard stripe / flag band (green/yellow/red) / guard stripe.
   Guards split in sixths: white edge, four sixths of yellow carrying
   black boxes (long, then small), white edge — hairlines throughout.
   Thread colours are the cloth's own, deliberately outside the UI
   palette — the netela rule keeps them inside this band. */
const THREAD = {
  red: '#C0392B',
  yellow: '#E9A820',
  green: '#1E7A3C',
  black: '#221B12',
  white: '#FDFBF4',
}

const S = 0.6 // overall scale — band is 60% of the drawn design
const SECTION = 12 * S // height of each of the three sections
const HAIR = 1 * S // hairline thickness
const PW = 24 * S // pattern tile width

/* Frayed cloth end below the band — seeded RNG so the fringe is
   irregular but identical on every render. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FRAY_H = 11 * S // fringe depth
const FRAY_W = 96 * S // fringe pattern tile width
const FRAY_THREADS = (() => {
  const rand = mulberry32(7)
  const threads: { x: number; h: number; o: number; lean: number }[] = []
  let x = 1 * S
  while (x < FRAY_W - S) {
    threads.push({
      x,
      h: FRAY_H * (0.3 + rand() * 0.7),
      o: 0.55 + rand() * 0.45,
      lean: (rand() - 0.5) * 2.4 * S,
    })
    x += (1.7 + rand() * 2.6) * S
  }
  return threads
})()

export default function Tibeb({ className = '' }: { className?: string }) {
  const id = useId()
  const total = SECTION * 3 + HAIR * 4
  return (
    <svg
      className={`block w-full ${className}`}
      height={total + FRAY_H}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width={PW} height={SECTION} patternUnits="userSpaceOnUse">
          {/* guard: white 1/12 edges, yellow 10/12 middle with boxes */}
          <rect width={PW} height={SECTION} fill={THREAD.white} />
          <rect y={SECTION / 12} width={PW} height={(SECTION * 10) / 12} fill={THREAD.yellow} />
          {/* hairlines separating white from yellow */}
          <rect y={SECTION / 12} width={PW} height={0.75 * S} fill={THREAD.black} />
          <rect y={(SECTION * 11) / 12 - 0.75 * S} width={PW} height={0.75 * S} fill={THREAD.black} />
          {/* long box, then small box — centred, clear of the yellow's edges */}
          <rect x={3 * S} y={SECTION / 3} width={10 * S} height={SECTION / 3} fill={THREAD.black} />
          <rect x={16 * S} y={SECTION / 3} width={5 * S} height={SECTION / 3} fill={THREAD.black} />
        </pattern>
        <pattern id={`${id}-fray`} width={FRAY_W} height={FRAY_H} patternUnits="userSpaceOnUse">
          {FRAY_THREADS.map((t, i) => (
            <line
              key={i}
              x1={t.x}
              y1="0"
              x2={t.x + t.lean}
              y2={t.h}
              stroke="#DCCDAF"
              strokeWidth={0.9 * S}
              strokeLinecap="round"
              opacity={t.o}
            />
          ))}
        </pattern>
      </defs>
      <rect y="0" width="100%" height={HAIR} fill={THREAD.black} />
      {/* translate instead of y: keeps the pattern aligned to the rect's own top */}
      <rect transform={`translate(0, ${HAIR})`} width="100%" height={SECTION} fill={`url(#${id})`} />
      <rect y={HAIR + SECTION} width="100%" height={HAIR} fill={THREAD.black} />
      <rect y={2 * HAIR + SECTION} width="100%" height={SECTION / 3} fill={THREAD.green} />
      <rect y={2 * HAIR + SECTION + SECTION / 3} width="100%" height={SECTION / 3} fill={THREAD.yellow} />
      <rect y={2 * HAIR + SECTION + (2 * SECTION) / 3} width="100%" height={SECTION / 3} fill={THREAD.red} />
      <rect y={2 * HAIR + 2 * SECTION} width="100%" height={HAIR} fill={THREAD.black} />
      <rect transform={`translate(0, ${3 * HAIR + 2 * SECTION})`} width="100%" height={SECTION} fill={`url(#${id})`} />
      <rect y={3 * HAIR + 3 * SECTION} width="100%" height={HAIR} fill={THREAD.black} />
      {/* frayed threads hanging off the cloth's edge */}
      <rect
        transform={`translate(0, ${total})`}
        width="100%"
        height={FRAY_H}
        fill={`url(#${id}-fray)`}
      />
    </svg>
  )
}
