import Tibeb from './Tibeb'

export default function Footer() {
  return (
    <footer>
      <Tibeb />
      <div className="bg-surface-inverse">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-8 text-center">
          <span className="fidel text-xl text-saffron-400" aria-hidden="true">፨</span>
          <p className="text-sm text-ink-on-dark">
            <span className="fidel">አቡጊዳ</span> · Abugida — learn Amharic, meet Ethiopia
          </p>
          <p className="text-xs text-clay-400">
            Built by two friends for the culture.
          </p>
        </div>
      </div>
    </footer>
  )
}
