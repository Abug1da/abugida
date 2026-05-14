import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-bold text-gray-900">
          Abugida
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/lessons" className="text-gray-600 hover:text-gray-900">
            Lessons
          </Link>
          {user ? (
            <>
              <Link to="/profile" className="text-gray-600 hover:text-gray-900">
                Profile
              </Link>
              <span className="text-gray-500">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={() => logout()}
                className="text-gray-600 hover:text-gray-900"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                Log in
              </Link>
              <Link to="/signup" className="text-gray-600 hover:text-gray-900">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
