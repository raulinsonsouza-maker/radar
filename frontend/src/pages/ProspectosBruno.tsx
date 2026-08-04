import { Fragment, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  clearSavedFilters,
  defaultFilters,
  fetchMeta,
  fetchProspectos,
  fetchSocios,
  formatCnpj,
  formatPorte,
  loadSavedFilters,
  nomeUf,
  saveFilters,
  searchMunicipios,
  UF_NOMES,
  whatsappUrl,
  type Filters,
  type MetaResponse,
  type Prospecto,
  type Socio,
} from '../api'
import { MultiPick } from '../components/MultiPick'
import { ProspectResultCardB } from '../components/prospectCards'

const AVATAR_TONES = [
  '',
  'company-avatar--green',
  'company-avatar--blue',
  'company-avatar--violet',
  'company-avatar--red',
  'company-avatar--gray',
] as const

function avatarTone(cnpj: string) {
  let hash = 0
  for (let i = 0; i < cnpj.length; i++) hash = (hash + cnpj.charCodeAt(i) * (i + 1)) % 97
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

function companyInitial(item: Prospecto) {
  const name = (item.nome_fantasia || item.razao_social || '?').trim()
  return name.charAt(0).toUpperCase()
}

function porteTag(item: Prospecto) {
  if (item.porte === '01') return 'ME'
  if (item.porte === '03') return 'EPP'
  if (item.porte === '05') return 'Média+'
  return formatPorte(item.porte, item.porte_descricao).slice(0, 8)
}

function FilterGroup({
  index,
  title,
  open,
  onToggle,
  children,
}: {
  index: string
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className={`filter-group ${open ? 'filter-group--open' : ''}`}>
      <button
        className="filter-group__toggle"
        type="button"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span>
          <i>{index}</i>
          {title}
        </span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      <div className="filter-group__body">{children}</div>
    </div>
  )
}

export default function ProspectosBruno() {
  const [filters, setFilters] = useState<Filters>(() => loadSavedFilters())
  const [meta, setMeta] = useState<MetaResponse | null>(null)
  const [items, setItems] = useState<Prospecto[]>([])
  const [total, setTotal] = useState(0)
  const [totalIsCapped, setTotalIsCapped] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [nichoQuery, setNichoQuery] = useState('')
  const [subnichoQuery, setSubnichoQuery] = useState('')
  const [commandQuery, setCommandQuery] = useState(() => loadSavedFilters().q)
  const [openGroups, setOpenGroups] = useState({
    loc: true,
    perfil: true,
    contato: false,
    cadastro: false,
    maturidade: false,
  })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sociosOpen, setSociosOpen] = useState<Record<string, boolean>>({})
  const [sociosCache, setSociosCache] = useState<Record<string, Socio[]>>({})
  const [sociosLoading, setSociosLoading] = useState<Record<string, boolean>>({})
  const [sociosError, setSociosError] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchMeta()
      .then((data) => {
        setMeta(data)
        const saved = loadSavedFilters()
        if (saved.nicho) {
          const pai = data.nichos.find((n) => n.slug === saved.nicho)
          if (pai) setNichoQuery(pai.nome)
        }
        if (saved.subnicho) {
          for (const n of data.nichos) {
            const filho = n.filhos.find((f) => f.slug === saved.subnicho)
            if (filho) {
              setSubnichoQuery(filho.nome)
              break
            }
          }
        }
      })
      .catch((err) => {
        setError(err.message || 'Falha ao carregar metadados')
      })
  }, [])

  useEffect(() => {
    saveFilters(filters)
  }, [filters])

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / filters.page_size)),
    [total, filters.page_size],
  )

  const nichoAtual = useMemo(
    () => (meta?.nichos || []).find((n) => n.slug === filters.nicho) || null,
    [meta, filters.nicho],
  )

  const subnichosFiltrados = useMemo(() => {
    const filhos = nichoAtual?.filhos || []
    const q = subnichoQuery.trim().toLowerCase()
    if (!q || (filters.subnicho && filhos.some((f) => f.slug === filters.subnicho && f.nome.toLowerCase() === q))) {
      return filhos
    }
    return filhos.filter(
      (f) => f.nome.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q),
    )
  }, [nichoAtual, subnichoQuery, filters.subnicho])

  const ufOptions = useMemo(() => {
    const list = meta?.ufs?.length ? meta.ufs : Object.keys(UF_NOMES)
    return [...list]
      .sort((a, b) => nomeUf(a).localeCompare(nomeUf(b), 'pt-BR'))
      .map((uf) => ({ value: uf, label: nomeUf(uf), hint: uf }))
  }, [meta])

  const loadCityOptions = useMemo(() => {
    return async (query: string) => {
      const rows = await searchMunicipios(query, filters.ufs)
      return rows.map((m) => ({
        value: m.codigo,
        label: m.nome,
        hint: nomeUf(m.uf),
      }))
    }
  }, [filters.ufs])

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (filters.ufs.length) n += 1
    if (filters.municipios.length) n += 1
    if (filters.nicho) n += 1
    if (filters.subnicho) n += 1
    if (filters.porte) n += 1
    if (filters.tem_telefone) n += 1
    if (filters.tem_email) n += 1
    if (filters.tem_socio_admin) n += 1
    if (filters.tem_telefone_2) n += 1
    if (filters.cnae) n += 1
    if (filters.idade_min || filters.capital_min) n += 1
    if (filters.matriz_apenas) n += 1
    return n
  }, [filters])

  const phoneCoverage = useMemo(() => {
    if (!items.length) return 0
    const withPhone = items.filter((i) => i.telefone || i.telefone_2).length
    return Math.round((withPhone / items.length) * 1000) / 10
  }, [items])

  const territory = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      const uf = item.uf || '?'
      counts.set(uf, (counts.get(uf) || 0) + 1)
    }
    const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
    const max = rows[0]?.[1] || 1
    return rows.map(([uf, count]) => ({
      uf,
      count,
      pct: Math.round((count / max) * 100),
    }))
  }, [items])

  async function runSearch(next: Filters = filters) {
    setLoading(true)
    setError(null)
    setSearched(true)
    setExpanded(null)
    try {
      const data = await fetchProspectos(next)
      setItems(data.items)
      setTotal(data.total)
      setTotalIsCapped(!!data.total_is_capped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na busca')
      setItems([])
      setTotal(0)
      setTotalIsCapped(false)
    } finally {
      setLoading(false)
    }
  }

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function explore(e?: FormEvent) {
    e?.preventDefault()
    const next = { ...filters, q: commandQuery, page: 1 }
    setFilters(next)
    void runSearch(next)
  }

  function goPage(page: number) {
    const next = { ...filters, page }
    setFilters(next)
    void runSearch(next)
  }

  function clearAll() {
    clearSavedFilters()
    setFilters(defaultFilters)
    setCommandQuery('')
    setNichoQuery('')
    setSubnichoQuery('')
    setItems([])
    setTotal(0)
    setTotalIsCapped(false)
    setSearched(false)
    setExpanded(null)
  }

  function setNichoFromText(text: string) {
    setNichoQuery(text)
    const match = (meta?.nichos || []).find((n) => n.nome === text || n.slug === text)
    if (match) {
      update('nicho', match.slug)
      update('subnicho', '')
      setSubnichoQuery('')
      return
    }
    if (!text.trim()) {
      update('nicho', '')
      update('subnicho', '')
      setSubnichoQuery('')
    } else if (filters.nicho && nichoAtual && text !== nichoAtual.nome) {
      update('nicho', '')
      update('subnicho', '')
      setSubnichoQuery('')
    }
  }

  async function toggleExpand(item: Prospecto) {
    if (expanded === item.cnpj) {
      setExpanded(null)
      setSociosOpen((prev) => ({ ...prev, [item.cnpj]: false }))
      return
    }
    setExpanded(item.cnpj)
    setSociosOpen((prev) => ({ ...prev, [item.cnpj]: true }))
    if (sociosCache[item.cnpj] || sociosLoading[item.cnpj]) return
    setSociosLoading((prev) => ({ ...prev, [item.cnpj]: true }))
    setSociosError((prev) => {
      const next = { ...prev }
      delete next[item.cnpj]
      return next
    })
    try {
      const rows = await fetchSocios(item.cnpj)
      setSociosCache((prev) => ({ ...prev, [item.cnpj]: rows }))
    } catch (err) {
      setSociosError((prev) => ({
        ...prev,
        [item.cnpj]: err instanceof Error ? err.message : 'Falha ao carregar sócios',
      }))
    } finally {
      setSociosLoading((prev) => ({ ...prev, [item.cnpj]: false }))
    }
  }

  function toggleSocios(cnpj: string) {
    setSociosOpen((prev) => ({ ...prev, [cnpj]: !prev[cnpj] }))
  }

  const activeChips: { key: string; label: string; clear: () => void }[] = []
  if (filters.tem_telefone) {
    activeChips.push({
      key: 'tel',
      label: 'Com telefone',
      clear: () => update('tem_telefone', false),
    })
  }
  if (filters.tem_email) {
    activeChips.push({
      key: 'email',
      label: 'Com e-mail',
      clear: () => update('tem_email', false),
    })
  }
  if (filters.matriz_apenas) {
    activeChips.push({
      key: 'matriz',
      label: 'Somente matriz',
      clear: () => update('matriz_apenas', false),
    })
  }
  if (filters.porte) {
    activeChips.push({
      key: 'porte',
      label: porteTag({ porte: filters.porte } as Prospecto),
      clear: () => update('porte', ''),
    })
  }
  for (const uf of filters.ufs) {
    activeChips.push({
      key: `uf-${uf}`,
      label: nomeUf(uf),
      clear: () => update('ufs', filters.ufs.filter((x) => x !== uf)),
    })
  }
  if (filters.nicho && nichoAtual) {
    activeChips.push({
      key: 'nicho',
      label: nichoAtual.nome,
      clear: () => {
        update('nicho', '')
        update('subnicho', '')
        setNichoQuery('')
        setSubnichoQuery('')
      },
    })
  }
  if (filters.subnicho && nichoAtual) {
    const sub = nichoAtual.filhos.find((f) => f.slug === filters.subnicho)
    if (sub) {
      activeChips.push({
        key: 'subnicho',
        label: sub.nome,
        clear: () => {
          update('subnicho', '')
          setSubnichoQuery('')
        },
      })
    }
  }

  const pageButtons = useMemo(() => {
    if (totalPages <= 1) return [] as number[]
    const pages = new Set<number>([1, totalPages, filters.page])
    for (let p = filters.page - 1; p <= filters.page + 1; p++) {
      if (p >= 1 && p <= totalPages) pages.add(p)
    }
    return [...pages].sort((a, b) => a - b)
  }, [filters.page, totalPages])

  return (
    <div className="prospectos-bruno">
      <section className="app-page-head">
        <div>
          <div className="app-breadcrumb">
            <span>Radar</span>
            <i>/</i>
            <b>Explorar mercado</b>
          </div>
          <h1>Explore seu mercado.</h1>
          <p>Combine sinais para encontrar as empresas certas para sua próxima abordagem.</p>
        </div>
      </section>

      <form className="market-command" aria-label="Comando de pesquisa" onSubmit={explore}>
        <div className="market-command__status">
          <span className="pulse-dot" />
          <div>
            <small>BUSCA ATIVA</small>
            <b>{loading ? 'Consultando…' : 'Empresas em operação'}</b>
          </div>
        </div>
        <div className="market-command__query">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            type="search"
            placeholder="Digite um segmento, atividade ou nome de empresa"
            aria-label="Segmento ou empresa"
            value={commandQuery}
            onChange={(e) => setCommandQuery(e.target.value)}
          />
        </div>
        <button className="app-button app-button--amber" type="submit" disabled={loading}>
          {loading ? 'Buscando…' : 'Buscar'}
          <span>↗</span>
        </button>
      </form>

      <section className="active-filter-row" aria-label="Filtros ativos">
        <span>Filtros ativos</span>
        <div className="active-filter-list">
          {activeChips.length === 0 && (
            <button type="button" disabled>
              Nenhum extra
            </button>
          )}
          {activeChips.map((chip) => (
            <button key={chip.key} type="button" onClick={chip.clear}>
              {chip.label} <i>×</i>
            </button>
          ))}
        </div>
        <button className="clear-link" type="button" onClick={clearAll}>
          Limpar tudo
        </button>
      </section>

      {error && <div className="bruno-banner-error">{error}</div>}

      <div className="workspace-grid">
        <aside className="filter-panel" aria-label="Filtros da busca">
          <div className="filter-panel__head">
            <div>
              <small>CONSTRUTOR DE MERCADO</small>
              <h2>Refine os sinais</h2>
            </div>
            <span className="filter-count">{activeFilterCount}</span>
          </div>

          <FilterGroup
            index="01"
            title="Localização"
            open={openGroups.loc}
            onToggle={() => setOpenGroups((g) => ({ ...g, loc: !g.loc }))}
          >
            <MultiPick
              label="Estados"
              placeholder="Digite para adicionar…"
              selected={filters.ufs}
              options={ufOptions}
              onChange={(ufs) => setFilters((prev) => ({ ...prev, ufs }))}
            />
            <MultiPick
              label="Cidades"
              placeholder="Digite ao menos 2 letras…"
              selected={filters.municipios}
              options={[]}
              loadOptions={loadCityOptions}
              onChange={(municipios) => update('municipios', municipios)}
            />
          </FilterGroup>

          <FilterGroup
            index="02"
            title="Perfil da empresa"
            open={openGroups.perfil}
            onToggle={() => setOpenGroups((g) => ({ ...g, perfil: !g.perfil }))}
          >
            <label className="field-label" htmlFor="bruno-nicho">
              Nicho ou atividade
            </label>
            <div className="field-with-icon">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="10" r="6" />
                <path d="M10 4v12M4 10h12" />
              </svg>
              <input
                id="bruno-nicho"
                type="text"
                list="bruno-nichos"
                placeholder="Ex.: Tecnologia, saúde..."
                value={filters.nicho && nichoAtual ? nichoAtual.nome : nichoQuery}
                onChange={(e) => setNichoFromText(e.target.value)}
              />
              <datalist id="bruno-nichos">
                {(meta?.nichos || []).map((n) => (
                  <option key={n.slug} value={n.nome} />
                ))}
              </datalist>
            </div>
            <label className="field-label" htmlFor="bruno-subnicho">
              Subnicho
            </label>
            <div className="field-with-icon">
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="10" cy="10" r="6" />
                <path d="M10 4v12M4 10h12" />
              </svg>
              <input
                id="bruno-subnicho"
                type="text"
                list="bruno-subnichos"
                placeholder={filters.nicho ? 'Todos ou refine…' : 'Primeiro escolha o nicho'}
                value={
                  filters.subnicho
                    ? nichoAtual?.filhos.find((f) => f.slug === filters.subnicho)?.nome ||
                      subnichoQuery
                    : subnichoQuery
                }
                disabled={!filters.nicho}
                onChange={(e) => {
                  const text = e.target.value
                  setSubnichoQuery(text)
                  const match = (nichoAtual?.filhos || []).find(
                    (f) => f.nome === text || f.slug === text,
                  )
                  update('subnicho', match ? match.slug : '')
                }}
              />
              <datalist id="bruno-subnichos">
                {subnichosFiltrados.map((f) => (
                  <option key={f.slug} value={f.nome} />
                ))}
              </datalist>
            </div>
            <fieldset className="size-options">
              <legend>Porte</legend>
              <label>
                <input
                  type="radio"
                  name="bruno-size"
                  checked={filters.porte === ''}
                  onChange={() => update('porte', '')}
                />
                <span>Todos</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="bruno-size"
                  checked={filters.porte === '01'}
                  onChange={() => update('porte', '01')}
                />
                <span>ME</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="bruno-size"
                  checked={filters.porte === '03'}
                  onChange={() => update('porte', '03')}
                />
                <span>EPP</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="bruno-size"
                  checked={filters.porte === '05'}
                  onChange={() => update('porte', '05')}
                />
                <span>Média+</span>
              </label>
            </fieldset>
          </FilterGroup>

          <FilterGroup
            index="03"
            title="Contato disponível"
            open={openGroups.contato}
            onToggle={() => setOpenGroups((g) => ({ ...g, contato: !g.contato }))}
          >
            <div className="check-list">
              <label>
                <span>
                  <input
                    type="checkbox"
                    checked={filters.tem_telefone}
                    onChange={(e) => update('tem_telefone', e.target.checked)}
                  />
                  <i />
                  Telefone
                </span>
              </label>
              <label>
                <span>
                  <input
                    type="checkbox"
                    checked={filters.tem_email}
                    onChange={(e) => update('tem_email', e.target.checked)}
                  />
                  <i />
                  E-mail
                </span>
              </label>
              <label>
                <span>
                  <input
                    type="checkbox"
                    checked={filters.tem_socio_admin}
                    onChange={(e) => update('tem_socio_admin', e.target.checked)}
                  />
                  <i />
                  Sócio-administrador
                </span>
              </label>
              <label>
                <span>
                  <input
                    type="checkbox"
                    checked={filters.matriz_apenas}
                    onChange={(e) => update('matriz_apenas', e.target.checked)}
                  />
                  <i />
                  Somente matriz
                </span>
              </label>
            </div>
          </FilterGroup>

          <FilterGroup
            index="04"
            title="Dados cadastrais"
            open={openGroups.cadastro}
            onToggle={() => setOpenGroups((g) => ({ ...g, cadastro: !g.cadastro }))}
          >
            <label className="field-label" htmlFor="bruno-cnae">
              CNAE específico
            </label>
            <input
              className="app-field"
              id="bruno-cnae"
              type="text"
              list="bruno-cnaes"
              placeholder="Código ou descrição"
              value={filters.cnae}
              onChange={(e) => update('cnae', e.target.value)}
            />
            <datalist id="bruno-cnaes">
              {(meta?.cnaes || []).slice(0, 200).map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.descricao}
                </option>
              ))}
            </datalist>
          </FilterGroup>

          <FilterGroup
            index="05"
            title="Maturidade e capital"
            open={openGroups.maturidade}
            onToggle={() => setOpenGroups((g) => ({ ...g, maturidade: !g.maturidade }))}
          >
            <div className="field-pair">
              <label>
                <span>Idade mínima</span>
                <input
                  className="app-field"
                  type="number"
                  placeholder="2 anos"
                  value={filters.idade_min}
                  onChange={(e) => update('idade_min', e.target.value)}
                />
              </label>
              <label>
                <span>Capital mínimo</span>
                <input
                  className="app-field"
                  type="text"
                  placeholder="R$ 50.000"
                  value={filters.capital_min}
                  onChange={(e) => update('capital_min', e.target.value)}
                />
              </label>
            </div>
          </FilterGroup>
        </aside>

        <section className="results-area" aria-label="Resultados da busca">
          <div className="market-overview">
            <article className="metric-card metric-card--main">
              <div className="metric-card__label">
                <span>EMPRESAS ENCONTRADAS</span>
                <i className="pulse-dot" />
              </div>
              <div className="metric-card__value">
                <strong>
                  {loading
                    ? '…'
                    : searched
                      ? `${totalIsCapped ? '>' : ''}${total.toLocaleString('pt-BR')}`
                      : '—'}
                </strong>
              </div>
              <small>Base ativa dentro dos critérios atuais</small>
            </article>

            <article className="metric-card">
              <div className="metric-card__label">
                <span>COBERTURA DE CONTATO</span>
                <b>PÁGINA</b>
              </div>
              <div className="metric-card__value">
                <strong>{searched && items.length ? `${phoneCoverage}%` : '—'}</strong>
              </div>
              <small>
                {searched && items.length
                  ? `${items.filter((i) => i.telefone || i.telefone_2).length} com telefone nesta página`
                  : 'Após buscar, mostra a cobertura desta página'}
              </small>
              {searched && items.length > 0 && (
                <div className="coverage-bar">
                  <span style={{ width: `${Math.min(100, phoneCoverage)}%` }} />
                </div>
              )}
            </article>

            <article className="metric-card territory-card">
              <div className="metric-card__label">
                <span>CONCENTRAÇÃO</span>
                <span>NESTA PÁGINA</span>
              </div>
              <div className="territory-bars">
                {territory.length === 0 && (
                  <div>
                    <span>—</span>
                    <i>
                      <b style={{ width: '0%' }} />
                    </i>
                    <em>0</em>
                  </div>
                )}
                {territory.map((row) => (
                  <div key={row.uf}>
                    <span>{row.uf}</span>
                    <i>
                      <b style={{ width: `${row.pct}%` }} />
                    </i>
                    <em>{row.count}</em>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <div className="results-card">
            <div className="results-card__head">
              <div>
                <div className="results-title">
                  <h2>Empresas encontradas</h2>
                  <span>
                    {loading
                      ? 'Buscando…'
                      : searched
                        ? `${items.length} visíveis`
                        : 'Aguardando busca'}
                  </span>
                </div>
                <p>
                  {searched
                    ? `Página ${filters.page} de ${totalPages.toLocaleString('pt-BR')}`
                    : 'Defina os filtros e explore o mercado.'}
                </p>
              </div>
            </div>

            {!searched && !loading && (
              <div className="results-empty">
                <span>⌁</span>
                <h3>Pronto para explorar</h3>
                <p>Use a barra de comando ou os filtros e clique em Buscar.</p>
              </div>
            )}

            {loading && (
              <div className="results-empty">
                <span>⌁</span>
                <h3>Consultando a base…</h3>
                <p>Isso pode levar alguns segundos.</p>
              </div>
            )}

            {searched && !loading && items.length === 0 && (
              <div className="results-empty">
                <span>⌁</span>
                <h3>Nenhuma empresa encontrada</h3>
                <p>Remova alguns filtros ou explore um segmento diferente.</p>
                <button className="app-button app-button--ghost" type="button" onClick={clearAll}>
                  Limpar filtros
                </button>
              </div>
            )}

            {searched && !loading && items.length > 0 && (
              <>
                <div className="company-table-wrap">
                  <table className="company-table">
                    <thead>
                      <tr>
                        <th>EMPRESA</th>
                        <th>SEGMENTO</th>
                        <th>LOCALIZAÇÃO</th>
                        <th>PORTE</th>
                        <th>CONTATO</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const name = item.nome_fantasia || item.razao_social || '—'
                        const isOpen = expanded === item.cnpj
                        const wa = whatsappUrl(item.telefone) || whatsappUrl(item.telefone_2)
                        return (
                          <Fragment key={item.cnpj}>
                            <tr
                              className={`company-row${isOpen ? ' is-expanded' : ''}`}
                              data-name={name}
                              onClick={() => void toggleExpand(item)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td>
                                <div className="company-cell">
                                  <span className={`company-avatar ${avatarTone(item.cnpj)}`.trim()}>
                                    {companyInitial(item)}
                                  </span>
                                  <div>
                                    <b>{name}</b>
                                    <small>
                                      {formatCnpj(item.cnpj)}
                                      {item.tipo_estabelecimento
                                        ? ` · ${item.tipo_estabelecimento}`
                                        : ''}
                                    </small>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="segment-cell">
                                  <b>{item.cnae_descricao || '—'}</b>
                                  <small>{item.cnae_fiscal_principal || ''}</small>
                                </div>
                              </td>
                              <td>
                                <div className="location-cell">
                                  <b>{item.municipio_nome || '—'}</b>
                                  <small>
                                    {item.uf || '—'} · Brasil
                                  </small>
                                </div>
                              </td>
                              <td>
                                <span className="size-tag">{porteTag(item)}</span>
                              </td>
                              <td>
                                <div className="contact-icons">
                                  <i
                                    className={item.telefone || item.telefone_2 ? 'is-on' : undefined}
                                    title="Telefone"
                                  >
                                    T
                                  </i>
                                  <i className={item.email ? 'is-on' : undefined} title="E-mail">
                                    E
                                  </i>
                                  <i className={wa ? 'is-on' : undefined} title="WhatsApp">
                                    W
                                  </i>
                                </div>
                              </td>
                              <td>
                                <button
                                  className="row-more"
                                  type="button"
                                  aria-label={isOpen ? 'Fechar detalhes' : 'Ver detalhes'}
                                  aria-expanded={isOpen}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    void toggleExpand(item)
                                  }}
                                >
                                  {isOpen ? '−' : '+'}
                                </button>
                              </td>
                            </tr>
                            {isOpen && (
                              <tr className="bruno-row-detail">
                                <td colSpan={6}>
                                  <div
                                    className="bruno-lead-card"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ProspectResultCardB
                                      item={item}
                                      sociosOpen={!!sociosOpen[item.cnpj]}
                                      sociosLoading={!!sociosLoading[item.cnpj]}
                                      sociosError={sociosError[item.cnpj]}
                                      socios={sociosCache[item.cnpj]}
                                      onToggleSocios={() => toggleSocios(item.cnpj)}
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="results-footer">
                  <span>
                    Mostrando <b>{items.length}</b> de{' '}
                    <b>
                      {totalIsCapped ? '>' : ''}
                      {total.toLocaleString('pt-BR')}
                    </b>{' '}
                    empresas
                  </span>
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button
                        type="button"
                        disabled={filters.page <= 1 || loading}
                        onClick={() => goPage(filters.page - 1)}
                      >
                        ←
                      </button>
                      {pageButtons.map((p, idx) => {
                        const prev = pageButtons[idx - 1]
                        const gap = prev != null && p - prev > 1
                        return (
                          <span key={p} style={{ display: 'contents' }}>
                            {gap && <span>…</span>}
                            <button
                              type="button"
                              className={p === filters.page ? 'is-current' : undefined}
                              onClick={() => goPage(p)}
                            >
                              {p}
                            </button>
                          </span>
                        )
                      })}
                      <button
                        type="button"
                        disabled={filters.page >= totalPages || loading}
                        onClick={() => goPage(filters.page + 1)}
                      >
                        →
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
