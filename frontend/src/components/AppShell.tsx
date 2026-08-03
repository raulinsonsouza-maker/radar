import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function AppShell() {
  const { user, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link to="/app" className="topbar-brand">
          <img src="/logotipo-branco.png" alt="Symbius" className="topbar-logo" />
          <span>Radar</span>
        </Link>
        <nav className="topbar-nav">
          <NavLink to="/app" className={({ isActive }) => (isActive ? 'on' : undefined)}>
            Prospecção
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'on' : undefined)}>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="topbar-user">
          <span className="topbar-name">{user?.nome}</span>
          <button type="button" className="btn secondary sm" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
