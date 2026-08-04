import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  loadUiLayout,
  saveUiLayout,
  syncUiLayoutQuery,
  type UiLayout,
} from '../uiLayout'
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
  const [layout, setLayout] = useState<UiLayout>(() => loadUiLayout())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from

  useEffect(() => {
    saveUiLayout(layout)
    syncUiLayoutQuery(layout)
  }, [layout])

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

  const form = (
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
        className={layout === 'bruno' ? 'button button--amber button--wide' : 'btn primary'}
        disabled={submitting || loading}
      >
        {submitting ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )

  if (layout === 'bruno') {
    return (
      <div className="lp-bruno login-bruno">
        <header className="login-bruno__top">
          <BrandMark />
          <div className="lp-layout-toggle" role="group" aria-label="Layout A/B">
            <button type="button" onClick={() => setLayout('atual')}>
              Atual
            </button>
            <button type="button" className="is-on" onClick={() => setLayout('bruno')}>
              Bruno
            </button>
          </div>
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
              <p>Entre para explorar empresas com filtros comerciais e contatos prontos para abordagem.</p>
            </div>
          </section>

          <section className="login-bruno__panel">
            <div className="login-bruno__card">
              <div className="eyebrow eyebrow--dark">
                <span className="eyebrow__index">02</span>
                Conta
              </div>
              <h1>Entrar no Radar</h1>
              <p className="login-bruno__lead">
                Use o e-mail e a senha fornecidos pela Symbius.
              </p>
              {form}
              <Link className="login-bruno__back" to="/?layout=bruno">
                ← Voltar ao site
              </Link>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__head">
          <Link to="/" className="login-brand">
            <img src="/logotipo-branco.png" alt="Symbius" />
          </Link>
          <div className="lp-layout-toggle layout-toggle-light" role="group" aria-label="Layout A/B">
            <button type="button" className="is-on" onClick={() => setLayout('atual')}>
              Atual
            </button>
            <button type="button" onClick={() => setLayout('bruno')}>
              Bruno
            </button>
          </div>
        </div>
        <h1>Entrar</h1>
        <p className="muted">Acesse a prospecção com o e-mail e senha fornecidos.</p>
        {form}
      </div>
    </div>
  )
}
