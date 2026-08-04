import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import '../App.css'
import '../bruno-landing.css'
import './login-bruno.css'

function BrandMark() {
  return (
    <Link className="brand brand--inline brand--light" to="/" aria-label="Symbius Radar">
      <svg className="brand__mark" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 5.5a14.5 14.5 0 1 1-10.25 4.25" />
        <path d="M20 11a9 9 0 1 1-6.36 2.64" />
        <path d="M20 16.25A3.75 3.75 0 1 1 16.25 20" />
        <path d="M20 20 7 7" />
      </svg>
      <span className="brand__name">Symbius</span>
      <span className="brand__product">Radar</span>
    </Link>
  )
}

export default function Login() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from

  if (!loading && user) {
    const dest =
      from && from !== '/login'
        ? from
        : user.role === 'admin'
          ? '/admin'
          : '/app'
    return <Navigate to={dest} replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const u = await login(email.trim(), password)
      navigate(u.role === 'admin' ? '/admin' : '/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="lp-bruno login-bruno">
      <header className="login-bruno__top">
        <BrandMark />
      </header>

      <main className="login-bruno__main">
        <section className="login-bruno__aside" aria-hidden="true">
          <div className="login-bruno__orbit">
            <span className="login-bruno__ring login-bruno__ring--one" />
            <span className="login-bruno__ring login-bruno__ring--two" />
            <span className="login-bruno__ring login-bruno__ring--three" />
            <span className="login-bruno__core">
              <b>RADAR</b>
              <small>live</small>
            </span>
          </div>
          <div className="login-bruno__aside-copy">
            <div className="eyebrow">
              <span className="eyebrow__index">01</span>
              Acesso
            </div>
            <h2>
              Seu mercado
              <br />
              <span>já está no Radar.</span>
            </h2>
            <p>
              Entre para explorar empresas com filtros comerciais e contatos prontos para
              abordagem.
            </p>
          </div>
        </section>

        <section className="login-bruno__panel">
          <div className="login-bruno__card">
            <div className="eyebrow eyebrow--dark">
              <span className="eyebrow__index">02</span>
              Conta
            </div>
            <h1>Entrar no Radar</h1>
            <p className="login-bruno__lead">Use o e-mail e a senha fornecidos pela Symbius.</p>
            <form className="login-form" onSubmit={(e) => void onSubmit(e)}>
              <label>
                E-mail
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {error && <div className="banner error">{error}</div>}
              <button
                type="submit"
                className="button button--amber button--wide"
                disabled={submitting || loading}
              >
                {submitting ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
            <Link className="login-bruno__back" to="/">
              ← Voltar ao site
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
