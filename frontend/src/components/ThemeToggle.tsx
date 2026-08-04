import { useTheme } from '../theme/ThemeContext'

function IconMoon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M21 14.3A8.5 8.5 0 0 1 9.7 3a7 7 0 1 0 11.3 11.3Z"
      />
    </svg>
  )
}

function IconSun() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path
        fill="currentColor"
        d="M12 2.5a1 1 0 0 1 1 1V5a1 1 0 1 1-2 0V3.5a1 1 0 0 1 1-1Zm0 14a1 1 0 0 1 1 1v1.5a1 1 0 1 1-2 0V17.5a1 1 0 0 1 1-1Zm9.5-5.5a1 1 0 0 1-1 1H19a1 1 0 1 1 0-2h1.5a1 1 0 0 1 1 1ZM6 12a1 1 0 0 1-1 1H3.5a1 1 0 1 1 0-2H5a1 1 0 0 1 1 1Zm11.07 6.07a1 1 0 0 1 0 1.41l-1.06 1.06a1 1 0 1 1-1.41-1.41l1.06-1.06a1 1 0 0 1 1.41 0ZM9.4 5.46a1 1 0 0 1 0 1.41L8.34 7.93A1 1 0 1 1 6.93 6.52L8 5.46a1 1 0 0 1 1.41 0Zm8.66 1.06a1 1 0 0 1-1.41 0L15.6 5.46A1 1 0 0 1 17 4.05l1.06 1.06a1 1 0 0 1 0 1.41ZM8.34 16.07a1 1 0 0 1 0 1.41L7.28 18.54A1 1 0 1 1 5.86 17.1l1.06-1.06a1 1 0 0 1 1.42.03Z"
      />
    </svg>
  )
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      className={`theme-toggle${isLight ? ' is-light' : ''}`}
      role="switch"
      aria-checked={isLight}
      aria-label={isLight ? 'Ativar tema escuro' : 'Ativar tema claro'}
      title={isLight ? 'Tema claro' : 'Tema escuro'}
      onClick={toggleTheme}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-icon moon">
          <IconMoon />
        </span>
        <span className="theme-toggle-icon sun">
          <IconSun />
        </span>
        <span className="theme-toggle-thumb" />
      </span>
    </button>
  )
}
