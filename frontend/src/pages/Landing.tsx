import { Link } from 'react-router-dom'
import '../App.css'

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-glow" aria-hidden />
      <header className="landing-nav">
        <img src="/logotipo-branco.png" alt="Symbius" className="landing-logo" />
        <Link to="/login" className="btn primary">
          Entrar
        </Link>
      </header>

      <main className="landing-hero">
        <p className="eyebrow">Radar Symbius</p>
        <h1 className="landing-brand">Symbius</h1>
        <p className="landing-lead">
          Prospecção B2B com dados oficiais de CNPJ — filtre por nicho, região e contato
          para abordar empresas certas.
        </p>
        <div className="landing-cta">
          <Link to="/login" className="btn primary lg">
            Acessar a plataforma
          </Link>
        </div>
      </main>
    </div>
  )
}
