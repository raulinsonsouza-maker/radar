import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import '../bruno.css'

export function AppShell() {
  const { user, logout } = useAuth()

  const initials = (user?.nome || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'U'

  return (
    <div className="app-shell ui-bruno">
      <header className="bruno-topbar">
        <div className="bruno-topbar__left">
          <Link to="/app" className="bruno-brand" aria-label="Radar Symbius">
            <svg className="bruno-brand__mark" viewBox="0 0 40 40" aria-hidden="true">
              <path d="M20 5.5a14.5 14.5 0 1 1-10.25 4.25" />
              <path d="M20 11a9 9 0 1 1-6.36 2.64" />
              <path d="M20 16.25A3.75 3.75 0 1 1 16.25 20" />
              <path d="M20 20 7 7" />
            </svg>
            <span className="bruno-brand__name">Symbius</span>
            <span className="bruno-brand__product">Radar</span>
          </Link>
          <span className="bruno-topbar__context">Inteligência de mercado</span>
        </div>

        <div className="bruno-topbar__actions">
          <button type="button" className="bruno-profile" onClick={logout} title="Sair">
            <span>{initials}</span>
            <div>
              <b>{user?.nome || 'Usuário'}</b>
              <small>{user?.role === 'admin' ? 'Administrador' : 'Usuário'}</small>
            </div>
          </button>
        </div>
      </header>

      <aside className="bruno-rail" aria-label="Navegação">
        <nav>
          <NavLink
            to="/app"
            className={({ isActive }) => (isActive ? 'bruno-rail__active' : undefined)}
            title="Explorar mercado"
            aria-label="Explorar mercado"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 4V2M12 22v-2M4 12H2M22 12h-2" />
            </svg>
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) => (isActive ? 'bruno-rail__active' : undefined)}
              title="Admin"
              aria-label="Admin"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63h.01A1.7 1.7 0 0 0 10.03 3H14v.09A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9v.01A1.7 1.7 0 0 0 21 10.03V14h-.09A1.7 1.7 0 0 0 19.4 15Z" />
              </svg>
            </NavLink>
          )}
        </nav>
      </aside>

      <div className="bruno-outlet">
        <Outlet />
      </div>
    </div>
  )
}
