import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Tibeb from './Tibeb'

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="bg-surface-page">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link to="/" className="flex items-baseline gap-3">
          <span className="fidel text-2xl leading-none text-brand">አቡጊዳ</span>
          <span className="eyebrow hidden sm:inline">Abugida</span>
        </Link>
        <div className="flex items-center gap-4 text-sm font-semibold text-ink">
          <Link to="/lessons" className="hover:text-brand">
            Lessons
          </Link>
          {user ? (
            <>
              <span className="fidel text-brand opacity-60" aria-hidden="true">፣</span>
              <Link to="/profile" className="hover:text-brand">
                Profile
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="text-ink-muted hover:text-brand"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <span className="fidel text-brand opacity-60" aria-hidden="true">፣</span>
              <Link to="/login" className="hover:text-brand">
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-clay-50 shadow-sm transition-colors hover:bg-brand-hover"
              >
                Start learning
              </Link>
            </>
          )}
        </div>
      </nav>
      <Tibeb />
    </header>
  )
}
