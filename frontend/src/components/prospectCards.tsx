import type { ReactNode } from 'react'
import type { Prospecto, Socio } from '../api'
import {
  formatCep,
  formatCnpj,
  formatDate,
  formatIdade,
  formatMoney,
  formatPhone,
  formatPorte,
  googlePersonResearchUrl,
  googleResearchUrl,
  isNaturezaTitular,
  nomeDecisor,
  whatsappUrl,
} from '../api'

export type CardsLayout = 'a' | 'b'

const LAYOUT_KEY = 'symbius-cards-layout'

export function loadCardsLayout(): CardsLayout {
  try {
    const q = new URLSearchParams(window.location.search).get('cards')
    if (q === 'a' || q === 'b') return q
    const saved = localStorage.getItem(LAYOUT_KEY)
    if (saved === 'a' || saved === 'b') return saved
  } catch {
    /* ignore */
  }
  return 'b'
}

export function saveCardsLayout(layout: CardsLayout) {
  try {
    localStorage.setItem(LAYOUT_KEY, layout)
  } catch {
    /* ignore */
  }
}

function IconLupa({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M16.2 16.2 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PersonResearchLink({
  nome,
  municipio,
  uf,
  empresa,
  label = 'Pesquisar pessoa no Google',
}: {
  nome?: string | null
  municipio?: string | null
  uf?: string | null
  empresa?: string | null
  label?: string
}) {
  const href = nome ? googlePersonResearchUrl(nome, { municipio, uf, empresa }) : null
  if (!href) return null
  return (
    <a
      className="research-btn research-btn--inline"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
    >
      <IconLupa size={13} />
    </a>
  )
}

function MetricIcon({ name }: { name: string }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    focusable: false as const,
  }
  switch (name) {
    case 'phone':
      return (
        <svg {...common}>
          <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.5v3A2 2 0 0 1 18 19 14.5 14.5 0 0 1 3.5 4.5 2 2 0 0 1 6.5 3.5Z" />
        </svg>
      )
    case 'mail':
      return (
        <svg {...common}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
        </svg>
      )
    case 'age':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      )
    case 'building':
      return (
        <svg {...common}>
          <path d="M4.5 20.5h15M6.5 20.5V6.5l5-3 5 3v14M10 9.5h1M13 9.5h1M10 13h1M13 13h1M10 16.5h1M13 16.5h1" />
        </svg>
      )
    case 'money':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v9M9.5 9.5c.6-1 1.5-1.5 2.5-1.5s2 .6 2 1.75-1 1.75-2.5 2.25-2.5.9-2.5 2.25 1 1.75 2.5 1.75 2-.6 2.5-1.5" />
        </svg>
      )
    case 'porte':
      return (
        <svg {...common}>
          <path d="M4 18.5h16M7 18.5V10l5-4.5 5 4.5v8.5M10 14h4v4.5h-4z" />
        </svg>
      )
    case 'people':
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="2.5" />
          <circle cx="16" cy="9.5" r="2" />
          <path d="M4.5 18.5c.5-3 2.4-4.5 4.5-4.5s4 1.5 4.5 4.5M13.5 18.5c.3-2 1.5-3.2 3-3.2 1.4 0 2.5 1 3 3.2" />
        </svg>
      )
    case 'tax':
      return (
        <svg {...common}>
          <path d="M6 4.5h9l3 3V19.5H6z" />
          <path d="M15 4.5V7.5h3M9 11.5h6M9 15h6" />
        </svg>
      )
    case 'activity':
      return (
        <svg {...common}>
          <path d="M4.5 16.5 9 9.5l3.5 5 3-7 4 9" />
        </svg>
      )
    case 'pin':
      return (
        <svg {...common}>
          <path d="M12 21s6.5-5.2 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.8 12 21 12 21Z" />
          <circle cx="12" cy="10.5" r="2.2" />
        </svg>
      )
    case 'contact':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5.5 19.5c1.2-3.2 3.4-4.8 6.5-4.8s5.3 1.6 6.5 4.8" />
        </svg>
      )
    case 'decisor':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M6 19.5c1-3.5 3-5 6-5s5 1.5 6 5M16.5 6.5 19 4M19 4h-2.5M19 4v2.5" />
        </svg>
      )
    default:
      return null
  }
}

function MetricTile({
  icon,
  label,
  value,
  wide,
  children,
}: {
  icon: string
  label: string
  value?: ReactNode
  wide?: boolean
  children?: ReactNode
}) {
  return (
    <div className={`metric-tile${wide ? ' metric-tile--wide' : ''}`}>
      <span className="metric-tile-icon">
        <MetricIcon name={icon} />
      </span>
      <div className="metric-tile-body">
        <span className="metric-tile-label">{label}</span>
        {value != null && <strong className="metric-tile-value">{value}</strong>}
        {children}
      </div>
    </div>
  )
}

function CardHeader({ item }: { item: Prospecto }) {
  return (
    <div className="result-top">
      <div className="result-title">
        <h3>{item.razao_social || 'Sem razão social'}</h3>
        {item.nome_fantasia && <p className="fantasia">{item.nome_fantasia}</p>}
        <p className="cnpj mono">{formatCnpj(item.cnpj)}</p>
      </div>
      <div className="result-top-actions">
        <a
          className="research-btn"
          href={googleResearchUrl(item)}
          target="_blank"
          rel="noopener noreferrer"
          title="Pesquisar empresa no Google"
          aria-label="Pesquisar empresa no Google"
        >
          <IconLupa />
        </a>
        <div className="tags">
          {item.tipo_estabelecimento && (
            <span className="tag soft">{item.tipo_estabelecimento}</span>
          )}
          {item.opcao_simples === 'S' && <span className="tag">Simples</span>}
        </div>
      </div>
    </div>
  )
}

function ContactBlock({ item }: { item: Prospecto }) {
  return (
    <>
      {(() => {
        const label = formatPhone(item.telefone) || 'Sem telefone'
        const wpp = whatsappUrl(item.telefone)
        if (wpp) {
          return (
            <a
              className="phone-wpp"
              href={wpp}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir no WhatsApp"
            >
              {label}
            </a>
          )
        }
        return <strong>{label}</strong>
      })()}
      {item.telefone_2 &&
        (() => {
          const label2 = formatPhone(item.telefone_2)
          const wpp2 = whatsappUrl(item.telefone_2)
          if (wpp2) {
            return (
              <a
                className="phone-wpp secondary-phone"
                href={wpp2}
                target="_blank"
                rel="noopener noreferrer"
                title="2º telefone"
              >
                {label2}
              </a>
            )
          }
          return <span>2º: {label2}</span>
        })()}
      {item.email ? (
        <a className="email" href={`mailto:${item.email}`}>
          {item.email.toLowerCase()}
        </a>
      ) : (
        <span>Sem e-mail</span>
      )}
    </>
  )
}

function SociosBlock({
  item,
  open,
  loading,
  error,
  socios,
  onToggle,
}: {
  item: Prospecto
  open: boolean
  loading: boolean
  error?: string
  socios?: Socio[]
  onToggle: () => void
}) {
  return (
    <div className="socios-block">
      <button type="button" className="socios-toggle" aria-expanded={open} onClick={onToggle}>
        {open
          ? isNaturezaTitular(item.natureza_juridica) && (item.qtd_socios ?? 0) === 0
            ? 'Ocultar titular'
            : 'Ocultar sócios'
          : isNaturezaTitular(item.natureza_juridica) && (item.qtd_socios ?? 0) === 0
            ? 'Ver titular'
            : 'Ver sócios'}
      </button>

      {open && (
        <div className="socios-panel">
          {loading && <p className="socios-status">Carregando…</p>}
          {error && <p className="socios-status error">{error}</p>}
          {!loading &&
            !error &&
            socios &&
            socios.length === 0 &&
            isNaturezaTitular(item.natureza_juridica) &&
            item.razao_social && (
              <ul className="socios-list">
                <li className="socio-item admin">
                  <div className="socio-main">
                    <strong className="name-with-research">
                      <span>{item.razao_social}</span>
                      <PersonResearchLink
                        nome={item.razao_social}
                        municipio={item.municipio_nome}
                        uf={item.uf}
                        empresa={item.nome_fantasia || item.razao_social}
                        label="Pesquisar titular no Google"
                      />
                      <span className="admin-badge">Titular</span>
                    </strong>
                    <span className="socio-meta">
                      {item.natureza_descricao || 'Empresário individual'}
                    </span>
                  </div>
                </li>
              </ul>
            )}
          {!loading &&
            !error &&
            socios &&
            socios.length === 0 &&
            !(isNaturezaTitular(item.natureza_juridica) && item.razao_social) && (
              <p className="socios-status">Nenhum sócio encontrado.</p>
            )}
          {!loading && socios && socios.length > 0 && (
            <ul className="socios-list">
              {socios.map((socio, idx) => (
                <li
                  key={`${item.cnpj}-${socio.cnpj_cpf_socio || ''}-${idx}`}
                  className={`socio-item${socio.eh_admin ? ' admin' : ''}`}
                >
                  <div className="socio-main">
                    <strong className="name-with-research">
                      <span>{socio.nome_socio || 'Sem nome'}</span>
                      <PersonResearchLink
                        nome={socio.nome_socio}
                        municipio={item.municipio_nome}
                        uf={item.uf}
                        empresa={item.nome_fantasia || item.razao_social}
                        label={
                          socio.eh_admin
                            ? 'Pesquisar decisor no Google'
                            : 'Pesquisar sócio no Google'
                        }
                      />
                      {socio.eh_admin && <span className="admin-badge">Decisor</span>}
                    </strong>
                    <span className="socio-meta">
                      {[
                        socio.tipo_socio,
                        socio.qualificacao_descricao,
                        socio.cnpj_cpf_socio,
                        socio.faixa_etaria_descricao,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <div className="socio-side">
                    <span>Entrada: {formatDate(socio.data_entrada_sociedade)}</span>
                    {socio.pais_nome && <span>{socio.pais_nome}</span>}
                    {socio.nome_representante && (
                      <span>
                        Rep.: {socio.nome_representante}
                        {socio.qualificacao_representante_descricao
                          ? ` (${socio.qualificacao_representante_descricao})`
                          : ''}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

type CardProps = {
  item: Prospecto
  sociosOpen: boolean
  sociosLoading: boolean
  sociosError?: string
  socios?: Socio[]
  onToggleSocios: () => void
}

function phoneCount(item: Prospecto) {
  return (item.telefone ? 1 : 0) + (item.telefone_2 ? 1 : 0)
}

export function ProspectResultCardA({
  item,
  sociosOpen,
  sociosLoading,
  sociosError,
  socios,
  onToggleSocios,
}: CardProps) {
  return (
    <article className="result-card">
      <CardHeader item={item} />
      <div className="result-grid">
        <div className="field">
          <span className="field-label">Atividade</span>
          <strong>{item.cnae_descricao || 'Sem descrição'}</strong>
          <span className="mono">{item.cnae_fiscal_principal || '—'}</span>
          {item.cnae_fiscal_secundaria && (
            <span className="muted-extra">
              Secundários: {item.cnae_fiscal_secundaria.split(',').slice(0, 3).join(', ')}
              {item.cnae_fiscal_secundaria.split(',').length > 3 ? '…' : ''}
            </span>
          )}
        </div>
        <div className="field">
          <span className="field-label">Local</span>
          <strong>
            {item.municipio_nome || '—'}
            {item.uf ? ` · ${item.uf}` : ''}
          </strong>
          <span>
            {[item.logradouro, item.numero].filter(Boolean).join(', ') || 'Endereço não informado'}
            {item.bairro ? ` · ${item.bairro}` : ''}
            {item.cep ? ` · ${formatCep(item.cep)}` : ''}
          </span>
        </div>
        <div className="field">
          <span className="field-label">Porte / capital</span>
          <strong>{formatPorte(item.porte, item.porte_descricao)}</strong>
          <span>{formatMoney(item.capital_social)}</span>
          {(item.qtd_filiais ?? 0) > 0 && (
            <span>
              {item.qtd_filiais} filial{item.qtd_filiais === 1 ? '' : 'is'}
            </span>
          )}
        </div>
        <div className="field">
          <span className="field-label">Contato</span>
          <ContactBlock item={item} />
        </div>
        <div className="field">
          <span className="field-label">Natureza / idade</span>
          <strong>{item.natureza_descricao || '—'}</strong>
          <span>
            Início: {formatDate(item.data_inicio_atividade)}
            {item.idade_anos != null ? ` · ${formatIdade(item.idade_anos)}` : ''}
          </span>
        </div>
        <div className="field">
          <span className="field-label">Decisor</span>
          {(() => {
            const decisor = nomeDecisor(item)
            return (
              <>
                <strong className="name-with-research">
                  <span>{decisor.nome || 'Não identificado'}</span>
                  <PersonResearchLink
                    nome={decisor.nome}
                    municipio={item.municipio_nome}
                    uf={item.uf}
                    empresa={item.nome_fantasia || item.razao_social}
                    label="Pesquisar decisor no Google"
                  />
                </strong>
                <span>
                  {decisor.tipo === 'titular'
                    ? 'Titular da empresa'
                    : item.qtd_socios != null
                      ? `${item.qtd_socios} sócio${item.qtd_socios === 1 ? '' : 's'} no quadro`
                      : 'Quadro societário'}
                </span>
              </>
            )
          })()}
        </div>
      </div>
      <SociosBlock
        item={item}
        open={sociosOpen}
        loading={sociosLoading}
        error={sociosError}
        socios={socios}
        onToggle={onToggleSocios}
      />
    </article>
  )
}

export function ProspectResultCardB({
  item,
  sociosOpen,
  sociosLoading,
  sociosError,
  socios,
  onToggleSocios,
}: CardProps) {
  const decisor = nomeDecisor(item)
  const phones = phoneCount(item)

  return (
    <article className="result-card result-card--b">
      <CardHeader item={item} />

      <div className="metric-grid">
        <MetricTile icon="phone" label="Telefones" value={phones} />
        <MetricTile icon="mail" label="E-mail" value={item.email ? '1' : '0'} />
        <MetricTile
          icon="calendar"
          label="Abertura"
          value={formatDate(item.data_inicio_atividade)}
        />
        <MetricTile
          icon="age"
          label="Idade"
          value={item.idade_anos != null ? formatIdade(item.idade_anos) : '—'}
        />
        <MetricTile
          icon="building"
          label="Tipo"
          value={item.tipo_estabelecimento || '—'}
        />
        <MetricTile icon="money" label="Capital social" value={formatMoney(item.capital_social)} />
        <MetricTile
          icon="porte"
          label="Porte"
          value={formatPorte(item.porte, item.porte_descricao)}
        />
        <MetricTile
          icon="people"
          label="Sócios"
          value={item.qtd_socios != null ? String(item.qtd_socios) : '—'}
        />
        <MetricTile
          icon="tax"
          label="Tributação"
          value={item.opcao_simples === 'S' ? 'Simples Nacional' : '—'}
        />
        {(item.qtd_filiais ?? 0) > 0 && (
          <MetricTile
            icon="building"
            label="Filiais"
            value={String(item.qtd_filiais)}
          />
        )}
      </div>

      <div className="metric-grid metric-grid--wide">
        <MetricTile icon="activity" label="Atividade" wide>
          <strong className="metric-tile-value">{item.cnae_descricao || 'Sem descrição'}</strong>
          <span className="metric-tile-extra mono">{item.cnae_fiscal_principal || '—'}</span>
          {item.cnae_fiscal_secundaria && (
            <span className="metric-tile-extra">
              Secundários: {item.cnae_fiscal_secundaria.split(',').slice(0, 3).join(', ')}
              {item.cnae_fiscal_secundaria.split(',').length > 3 ? '…' : ''}
            </span>
          )}
        </MetricTile>
        <MetricTile icon="pin" label="Local" wide>
          <strong className="metric-tile-value">
            {item.municipio_nome || '—'}
            {item.uf ? ` · ${item.uf}` : ''}
          </strong>
          <span className="metric-tile-extra">
            {[item.logradouro, item.numero].filter(Boolean).join(', ') || 'Endereço não informado'}
            {item.bairro ? ` · ${item.bairro}` : ''}
            {item.cep ? ` · ${formatCep(item.cep)}` : ''}
          </span>
        </MetricTile>
        <MetricTile icon="contact" label="Contato" wide>
          <div className="metric-tile-stack">
            <ContactBlock item={item} />
          </div>
        </MetricTile>
        <MetricTile icon="decisor" label="Decisor" wide>
          <strong className="metric-tile-value name-with-research">
            <span>{decisor.nome || 'Não identificado'}</span>
            <PersonResearchLink
              nome={decisor.nome}
              municipio={item.municipio_nome}
              uf={item.uf}
              empresa={item.nome_fantasia || item.razao_social}
              label="Pesquisar decisor no Google"
            />
          </strong>
          <span className="metric-tile-extra">
            {decisor.tipo === 'titular'
              ? 'Titular da empresa'
              : item.natureza_descricao || 'Quadro societário'}
          </span>
        </MetricTile>
      </div>

      <SociosBlock
        item={item}
        open={sociosOpen}
        loading={sociosLoading}
        error={sociosError}
        socios={socios}
        onToggle={onToggleSocios}
      />
    </article>
  )
}

export function CardsLayoutToggle({
  layout,
  onChange,
}: {
  layout: CardsLayout
  onChange: (next: CardsLayout) => void
}) {
  return (
    <div className="cards-layout-toggle" role="group" aria-label="Layout dos cards">
      <span className="cards-layout-label">Layout</span>
      <button
        type="button"
        className={`cards-layout-btn${layout === 'a' ? ' is-active' : ''}`}
        aria-pressed={layout === 'a'}
        onClick={() => onChange('a')}
      >
        A
      </button>
      <button
        type="button"
        className={`cards-layout-btn${layout === 'b' ? ' is-active' : ''}`}
        aria-pressed={layout === 'b'}
        onClick={() => onChange('b')}
      >
        B
      </button>
    </div>
  )
}
