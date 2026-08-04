import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { submitLeadCapture } from '../api'
import '../bruno-landing.css'

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <Link
      className={`brand brand--inline ${light ? 'brand--light' : 'brand--dark'}`}
      to="/"
      aria-label="Symbius Radar"
    >
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

export default function LandingBruno() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [leadSubmitting, setLeadSubmitting] = useState(false)
  const [leadError, setLeadError] = useState<string | null>(null)
  const [leadDone, setLeadDone] = useState(false)

  useEffect(() => {
    const items = document.querySelectorAll('.lp-bruno .reveal')
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'))
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12 },
    )
    items.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  async function onLeadSubmit(e: FormEvent) {
    e.preventDefault()
    setLeadError(null)
    setLeadSubmitting(true)
    try {
      await submitLeadCapture({ nome, email, whatsapp })
      setLeadDone(true)
      setNome('')
      setEmail('')
      setWhatsapp('')
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : 'Não foi possível enviar.')
    } finally {
      setLeadSubmitting(false)
    }
  }

  return (
    <div className="lp-bruno landing-page">
      <header className={`site-header${menuOpen ? ' menu-open' : ''}`}>
        <div className="site-header__inner">
          <BrandMark />

          <nav className="site-nav" aria-label="Navegação principal">
            <a href="#produto" onClick={() => setMenuOpen(false)}>
              Produto
            </a>
            <a href="#metodo" onClick={() => setMenuOpen(false)}>
              Como funciona
            </a>
            <a href="#confianca" onClick={() => setMenuOpen(false)}>
              Dados
            </a>
            <a href="#contato" onClick={() => setMenuOpen(false)}>
              Contato
            </a>
          </nav>

          <div className="header-actions">
            <Link className="text-link" to="/login">
              Entrar
            </Link>
            <a className="button button--dark button--small" href="#contato">
              Falar com a Symbius
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <button
            className="menu-toggle"
            type="button"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__grid page-shell">
            <div className="hero__content reveal">
              <div className="eyebrow eyebrow--dark">
                <span className="eyebrow__index">01</span>
                Inteligência comercial
              </div>
              <h1>
                Encontre o mercado
                <span>antes da concorrência.</span>
              </h1>
              <p className="hero__lead">
                Transforme dados públicos em uma visão clara de quem abordar, onde
                encontrar e por que cada empresa importa.
              </p>
              <div className="hero__actions">
                <a className="button button--dark" href="#contato">
                  Falar com a Symbius
                  <span aria-hidden="true">↗</span>
                </a>
                <a className="button button--ghost-dark" href="#produto">
                  Ver o produto
                  <span className="button__play" aria-hidden="true">
                    ▶
                  </span>
                </a>
              </div>
            </div>

            <div
              className="hero-visual reveal reveal--delay"
              aria-label="Visualização do mercado monitorado pelo Radar"
            >
              <div className="hero-visual__meta hero-visual__meta--top">
                <span>Base monitorada</span>
                <strong>10.5M</strong>
                <small>empresas brasileiras</small>
              </div>

              <div className="market-orbit" aria-hidden="true">
                <span className="market-orbit__ring market-orbit__ring--one" />
                <span className="market-orbit__ring market-orbit__ring--two" />
                <span className="market-orbit__ring market-orbit__ring--three" />
                <span className="market-orbit__sweep" />
                <span className="market-orbit__core">
                  <b>RADAR</b>
                  <small>live</small>
                </span>
                <span className="market-dot market-dot--1" />
                <span className="market-dot market-dot--2" />
                <span className="market-dot market-dot--3" />
                <span className="market-dot market-dot--4" />
                <span className="market-dot market-dot--5" />
                <span className="market-dot market-dot--6" />
              </div>

              <div className="hero-visual__card">
                <span className="status-dot" />
                <div>
                  <small>Oportunidade detectada</small>
                  <strong>+1.284 empresas</strong>
                </div>
                <span className="trend-pill">+18%</span>
              </div>

              <div className="hero-visual__label">
                <span>SP · Serviços B2B</span>
                <b>87%</b>
              </div>
            </div>
          </div>

          <div className="hero__foot page-shell">
            <div className="client-proof">
              <div className="avatar-stack" aria-hidden="true">
                <span>BM</span>
                <span>AR</span>
                <span>TC</span>
              </div>
              <p>
                <strong>Times comerciais</strong>
                <br />
                decidem com o Radar
              </p>
            </div>
            <div className="hero-stat">
              <span>91,4%</span>
              <p>
                de cobertura cadastral
                <br />
                em empresas ativas
              </p>
            </div>
            <p className="hero-note">
              Dados estruturados para revelar nichos, territórios e sinais comerciais
              que listas convencionais não mostram.
            </p>
          </div>
        </section>

        <section className="dark-intro section-dark" id="produto">
          <div className="page-shell">
            <div className="section-heading section-heading--split reveal">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow__index">02</span>
                  Um novo ponto de vista
                </div>
                <h2>
                  Seu mercado não é uma lista.
                  <br />
                  <span>É um sistema vivo.</span>
                </h2>
              </div>
              <p>
                O Radar organiza mais de 10 milhões de empresas ativas em uma interface feita para
                explorar, comparar e agir — sem planilhas genéricas ou buscas às cegas.
              </p>
            </div>

            <div className="signal-stage reveal">
              <div className="signal-stage__radar" aria-hidden="true">
                <div className="signal-stage__rings" />
                <div className="signal-stage__sweep" />
                <span className="signal-node signal-node--a">
                  <i /> SaaS
                </span>
                <span className="signal-node signal-node--b">
                  <i /> Saúde
                </span>
                <span className="signal-node signal-node--c">
                  <i /> Logística
                </span>
                <span className="signal-node signal-node--d">
                  <i /> Indústria
                </span>
                <div className="signal-stage__center">
                  <strong>18.642</strong>
                  <span>oportunidades</span>
                </div>
              </div>
              <div className="signal-stage__insight">
                <span className="live-chip">
                  <i /> Mercado em movimento
                </span>
                <h3>
                  Leia os sinais.
                  <br />
                  Encontre o momento.
                </h3>
                <p>
                  Combine localização, atividade, porte, maturidade e disponibilidade
                  de contato para formar um mercado que faz sentido para sua estratégia.
                </p>
                <Link className="inline-link" to="/login">
                  Abrir inteligência de mercado <span>↗</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="method-section section-dark" id="metodo">
          <div className="page-shell">
            <div className="section-heading reveal">
              <div className="eyebrow">
                <span className="eyebrow__index">03</span>
                Método Radar
              </div>
              <h2>
                Da hipótese comercial
                <br />
                <span>à próxima conversa.</span>
              </h2>
            </div>

            <div className="method-grid">
              <article className="method-card reveal">
                <div className="method-card__top">
                  <span>01</span>
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <circle cx="24" cy="24" r="16" />
                    <path d="m24 8 4 16-4 16-4-16 4-16Z" />
                  </svg>
                </div>
                <h3>Defina o território</h3>
                <p>
                  Comece pelo nicho, região e perfil de empresa que traduzem seu cliente
                  ideal.
                </p>
                <small>Segmento · CNAE · localização</small>
              </article>

              <article className="method-card reveal reveal--delay-sm">
                <div className="method-card__top">
                  <span>02</span>
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <circle cx="24" cy="24" r="16" />
                    <circle cx="24" cy="24" r="6" />
                    <path d="M24 2v8M24 38v8M2 24h8M38 24h8" />
                  </svg>
                </div>
                <h3>Refine os sinais</h3>
                <p>
                  Combine dados cadastrais e comerciais para remover ruído e elevar a
                  aderência.
                </p>
                <small>Porte · contato · maturidade</small>
              </article>

              <article className="method-card method-card--accent reveal reveal--delay">
                <div className="method-card__top">
                  <span>03</span>
                  <svg viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M8 24h30M28 14l10 10-10 10" />
                    <circle cx="10" cy="24" r="6" />
                  </svg>
                </div>
                <h3>Transforme em ação</h3>
                <p>
                  Analise, selecione e organize as empresas certas para sua próxima
                  abordagem.
                </p>
                <small>Listas · decisores · exportação</small>
              </article>
            </div>
          </div>
        </section>

        <section className="product-section section-dark" id="confianca">
          <div className="page-shell">
            <div className="product-copy reveal">
              <div className="eyebrow">
                <span className="eyebrow__index">04</span>
                Visão operacional
              </div>
              <h2>
                Tudo que importa.
                <br />
                <span>Na mesma leitura.</span>
              </h2>
              <p>
                Uma experiência desenhada para comparar empresas com velocidade e
                preservar o contexto de cada oportunidade.
              </p>

              <ul className="feature-list">
                <li>
                  <span>01</span>
                  <div>
                    <b>Filtros comerciais reais</b>
                    <small>Do macro ao específico, sem perder o raciocínio.</small>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <b>Contatos e contexto</b>
                    <small>Informação útil para decidir o próximo passo.</small>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <b>Listas vivas</b>
                    <small>Organize territórios e acompanhe sua tese comercial.</small>
                  </div>
                </li>
              </ul>
            </div>

            <div className="product-window reveal reveal--delay" aria-label="Prévia da plataforma Radar">
              <div className="product-window__bar">
                <div className="product-window__brand">
                  <span className="mini-mark" /> Radar
                </div>
                <div className="window-dots">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className="product-window__body">
                <aside className="mini-sidebar">
                  <span className="mini-sidebar__active" />
                  <span />
                  <span />
                  <span />
                  <span />
                </aside>
                <div className="mini-dashboard">
                  <div className="mini-dashboard__title">
                    <div>
                      <small>Explorar mercado</small>
                      <b>Empresas em São Paulo</b>
                    </div>
                    <button type="button">Exportar</button>
                  </div>
                  <div className="mini-stats">
                    <div>
                      <small>Empresas</small>
                      <b>18.642</b>
                      <em>+8,2%</em>
                    </div>
                    <div>
                      <small>Com telefone</small>
                      <b>14.091</b>
                      <em>75,6%</em>
                    </div>
                    <div className="mini-chart">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                  <div className="mini-table">
                    <div className="mini-table__head">
                      <span>EMPRESA</span>
                      <span>SEGMENTO</span>
                      <span>LOCAL</span>
                      <span>SINAL</span>
                    </div>
                    <div>
                      <span>
                        <i className="company-icon">N</i> Nexo Tecnologia
                      </span>
                      <span>Software B2B</span>
                      <span>São Paulo</span>
                      <span>
                        <b className="score score--high">92</b>
                      </span>
                    </div>
                    <div>
                      <span>
                        <i className="company-icon">A</i> Atria Saúde
                      </span>
                      <span>Clínicas</span>
                      <span>Campinas</span>
                      <span>
                        <b className="score">86</b>
                      </span>
                    </div>
                    <div>
                      <span>
                        <i className="company-icon">V</i> Vértice Log
                      </span>
                      <span>Logística</span>
                      <span>Jundiaí</span>
                      <span>
                        <b className="score">81</b>
                      </span>
                    </div>
                    <div>
                      <span>
                        <i className="company-icon">O</i> Onda Solar
                      </span>
                      <span>Energia</span>
                      <span>Sorocaba</span>
                      <span>
                        <b className="score">78</b>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-section section-dark">
          <div className="page-shell">
            <div className="trust-panel reveal">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow__index">05</span>
                  Por que confiar
                </div>
                <h2>
                  Dados oficiais.
                  <br />
                  <span>Leitura comercial.</span>
                </h2>
              </div>
              <div className="trust-metrics">
                <div>
                  <strong>10.463.086</strong>
                  <span>empresas ativas na base</span>
                </div>
                <div>
                  <strong>5.570</strong>
                  <span>municípios cobertos</span>
                </div>
                <div>
                  <strong>40+</strong>
                  <span>critérios de segmentação</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pricing-section section-light" id="contato">
          <div className="page-shell pricing-grid">
            <div className="pricing-copy reveal">
              <div className="eyebrow eyebrow--dark">
                <span className="eyebrow__index">06</span>
                Fale com a Symbius
              </div>
              <h2>
                Quer o Radar
                <br />
                no seu time?
              </h2>
              <p>
                Deixe seus dados. Nossa equipe entra em contato para entender seu
                mercado e liberar o acesso certo para a sua operação.
              </p>
            </div>
            <div className="lead-card reveal reveal--delay">
              <div className="lead-card__top">
                <span>Formulário de conversão</span>
                <i>Resposta rápida</i>
              </div>
              {leadDone ? (
                <div className="lead-card__success" role="status">
                  <strong>Obrigado!</strong>
                  <p>
                    Recebemos seus dados. Em breve entraremos em contato pelo
                    WhatsApp ou e-mail.
                  </p>
                </div>
              ) : (
                <form className="lead-form" onSubmit={onLeadSubmit} noValidate>
                  <label htmlFor="lead-nome">
                    Nome
                    <input
                      id="lead-nome"
                      name="nome"
                      type="text"
                      autoComplete="name"
                      placeholder="Seu nome"
                      required
                      minLength={2}
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                    />
                  </label>
                  <label htmlFor="lead-email">
                    E-mail
                    <input
                      id="lead-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="voce@empresa.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                  <label htmlFor="lead-whatsapp">
                    WhatsApp
                    <input
                      id="lead-whatsapp"
                      name="whatsapp"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="11999998888"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                    />
                  </label>
                  {leadError && (
                    <p className="lead-form__error" role="alert">
                      {leadError}
                    </p>
                  )}
                  <button
                    className="button button--light button--wide"
                    type="submit"
                    disabled={leadSubmitting}
                  >
                    {leadSubmitting ? 'Enviando…' : 'Falar com a Symbius'}
                    <span>↗</span>
                  </button>
                  <small className="lead-form__hint">
                    Usamos seus dados só para retorno comercial da Symbius.
                  </small>
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="final-cta section-dark">
          <div className="page-shell final-cta__inner reveal">
            <div>
              <span className="live-chip">
                <i /> Seu mercado está ativo
              </span>
              <h2>
                Descubra quem
                <br />
                está no seu Radar.
              </h2>
            </div>
            <a className="button button--light" href="#contato">
              Falar com a Symbius <span>↗</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer section-dark">
        <div className="page-shell site-footer__inner">
          <div className="site-footer__main">
            <div className="site-footer__brand">
              <BrandMark light />
              <p>Inteligência de mercado para quem vende B2B com método.</p>
            </div>
            <div className="site-footer__links">
              <div>
                <b>Produto</b>
                <a href="#produto">Visão geral</a>
                <a href="#metodo">Como funciona</a>
                <a href="#contato">Contato</a>
              </div>
              <div>
                <b>Empresa</b>
                <a href="#produto">Sobre a Symbius</a>
                <a href="#contato">Fale conosco</a>
                <Link to="/login">Entrar</Link>
              </div>
            </div>
          </div>
          <div className="footer-status">
            <span>
              <i /> Sistemas operacionais
            </span>
            <small>© {new Date().getFullYear()} Symbius</small>
          </div>
        </div>
      </footer>
    </div>
  )
}
