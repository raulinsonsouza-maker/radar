import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  clearSavedFilters,
  defaultFilters,
  fetchMeta,
  fetchProspectos,
  fetchSocios,
  loadSavedFilters,
  nomeUf,
  saveFilters,
  searchMunicipios,
  UF_NOMES,
  type Filters,
  type MetaResponse,
  type Prospecto,
  type Socio,
} from '../api'
import {
  ProspectResultCardB,
} from '../components/prospectCards'
import '../App.css'

function MultiPick({
  label,
  placeholder,
  selected,
  options,
  onChange,
  disabled,
  loadOptions,
  resolveLabel,
}: {
  label: string
  placeholder: string
  selected: string[]
  options: { value: string; label: string; hint?: string }[]
  onChange: (next: string[]) => void
  disabled?: boolean
  loadOptions?: (query: string) => Promise<{ value: string; label: string; hint?: string }[]>
  resolveLabel?: (value: string) => string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loadingOpts, setLoadingOpts] = useState(false)
  const [asyncOptions, setAsyncOptions] = useState<
    { value: string; label: string; hint?: string }[]
  >([])
  const [labelMap, setLabelMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!loadOptions) return
    const term = query.trim()
    if (term.length < 2) {
      setAsyncOptions([])
      setLoadingOpts(false)
      return
    }
    let cancelled = false
    setLoadingOpts(true)
    const timer = window.setTimeout(() => {
      void loadOptions(term)
        .then((rows) => {
          if (cancelled) return
          setAsyncOptions(rows)
          setLabelMap((prev) => {
            const next = { ...prev }
            for (const row of rows) next[row.value] = row.label
            return next
          })
        })
        .catch(() => {
          if (!cancelled) setAsyncOptions([])
        })
        .finally(() => {
          if (!cancelled) setLoadingOpts(false)
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, loadOptions])

  const filtered = useMemo(() => {
    if (loadOptions) {
      return asyncOptions.filter((o) => !selected.includes(o.value))
    }
    const q = query.trim().toLowerCase()
    const base = options.filter((o) => !selected.includes(o.value))
    if (!q) return base.slice(0, 40)
    return base
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q) ||
          (o.hint || '').toLowerCase().includes(q),
      )
      .slice(0, 40)
  }, [options, query, selected, loadOptions, asyncOptions])

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]))
    return selected.map((v) => ({
      value: v,
      label: map.get(v) || labelMap[v] || resolveLabel?.(v) || v,
    }))
  }, [options, selected, labelMap, resolveLabel])

  const showMenu =
    !disabled &&
    open &&
    (loadOptions ? query.trim().length >= 2 : query.trim().length > 0)

  function pick(option: { value: string; label: string }) {
    onChange([...selected, option.value])
    setLabelMap((prev) => ({ ...prev, [option.value]: option.label }))
    setQuery('')
    setAsyncOptions([])
    setOpen(false)
  }

  return (
    <div className={`multi-pick ${disabled ? 'disabled' : ''}`}>
      <span className="multi-pick-label">{label}</span>
      <div className="multi-pick-box">
        {selectedLabels.length > 0 && (
          <div className="multi-pick-chips">
            {selectedLabels.map((item) => (
              <button
                key={item.value}
                type="button"
                className="multi-chip"
                onClick={() => onChange(selected.filter((v) => v !== item.value))}
                disabled={disabled}
              >
                {item.label}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        )}
        <input
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (filtered[0]) pick(filtered[0])
            }
            if (e.key === 'Backspace' && !query && selected.length) {
              onChange(selected.slice(0, -1))
            }
          }}
        />
      </div>
      {showMenu && (
        <div className="multi-pick-menu">
          {loadingOpts && <div className="multi-pick-empty">Buscando…</div>}
          {!loadingOpts && filtered.length === 0 && (
            <div className="multi-pick-empty">Nenhum resultado</div>
          )}
          {!loadingOpts &&
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                className="multi-pick-option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
              >
                <strong>{o.label}</strong>
                {o.hint ? <span>{o.hint}</span> : null}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

function Prospectos() {
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
  const [showAdvanced, setShowAdvanced] = useState(false)
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
        setShowAdvanced(
          !!(
            saved.cnae ||
            saved.opcao_simples ||
            saved.capital_min ||
            saved.capital_max ||
            saved.data_inicio_de ||
            saved.data_inicio_ate ||
            saved.idade_min ||
            saved.idade_max ||
            (saved.natureza_grupo && saved.natureza_grupo !== 'alta')
          ),
        )
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

  const nichosFiltrados = useMemo(() => {
    const all = meta?.nichos || []
    const q = nichoQuery.trim().toLowerCase()
    if (!q || (nichoAtual && nichoAtual.nome.toLowerCase() === q)) return all
    return all.filter(
      (n) =>
        n.nome.toLowerCase().includes(q) ||
        (n.nome_oficial || '').toLowerCase().includes(q) ||
        n.slug.includes(q),
    )
  }, [meta, nichoQuery, nichoAtual])

  const subnichosFiltrados = useMemo(() => {
    const filhos = nichoAtual?.filhos || []
    const q = subnichoQuery.trim().toLowerCase()
    if (!q) return filhos
    return filhos.filter(
      (f) =>
        f.nome.toLowerCase().includes(q) ||
        (f.nome_oficial || '').toLowerCase().includes(q) ||
        f.slug.includes(q),
    )
  }, [nichoAtual, subnichoQuery])

  const naturezasAlta = useMemo(
    () => (meta?.naturezas || []).filter((n) => n.grupo === 'alta'),
    [meta],
  )
  const naturezasOpcional = useMemo(
    () => (meta?.naturezas || []).filter((n) => n.grupo === 'opcional'),
    [meta],
  )

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

  const advancedCount = useMemo(() => {
    let n = 0
    if (filters.cnae) n += 1
    if (filters.opcao_simples) n += 1
    if (filters.capital_min) n += 1
    if (filters.capital_max) n += 1
    if (filters.data_inicio_de) n += 1
    if (filters.data_inicio_ate) n += 1
    if (filters.idade_min) n += 1
    if (filters.idade_max) n += 1
    if (filters.tem_telefone_2) n += 1
    if (filters.tem_email) n += 1
    if (filters.tem_socio_admin) n += 1
    return n
  }, [filters])

  async function runSearch(next: Filters = filters) {
    setLoading(true)
    setError(null)
    setSearched(true)
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

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next = { ...filters, page: 1 }
    setFilters(next)
    void runSearch(next)
  }

  function goPage(page: number) {
    const next = { ...filters, page }
    setFilters(next)
    void runSearch(next)
  }

  async function toggleSocios(cnpj: string) {
    const isOpen = !!sociosOpen[cnpj]
    if (isOpen) {
      setSociosOpen((prev) => ({ ...prev, [cnpj]: false }))
      return
    }
    setSociosOpen((prev) => ({ ...prev, [cnpj]: true }))
    if (sociosCache[cnpj] || sociosLoading[cnpj]) return

    setSociosLoading((prev) => ({ ...prev, [cnpj]: true }))
    setSociosError((prev) => {
      const next = { ...prev }
      delete next[cnpj]
      return next
    })
    try {
      const rows = await fetchSocios(cnpj)
      setSociosCache((prev) => ({ ...prev, [cnpj]: rows }))
    } catch (err) {
      setSociosError((prev) => ({
        ...prev,
        [cnpj]: err instanceof Error ? err.message : 'Falha ao carregar sócios',
      }))
    } finally {
      setSociosLoading((prev) => ({ ...prev, [cnpj]: false }))
    }
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

  return (
    <div className="shell">
      <header className="hero compact">
        <div className="brand-copy">
          <p className="eyebrow">Radar</p>
          <h1>Prospecção B2B</h1>
          <p className="subtitle">
            Encontre empresas ativas por segmento e região, com dados prontos para abordar.
          </p>
        </div>
        <div className="hero-stats">
          <div>
            <span className="stat-label">Resultados</span>
            <strong>
              {loading
                ? '…'
                : searched
                  ? `${totalIsCapped ? 'Mais de ' : ''}${total.toLocaleString('pt-BR')}`
                  : '—'}
            </strong>
          </div>
        </div>
      </header>

      <form className="panel filters" onSubmit={onSubmit}>
        <div className="filter-block">
          <div className="filter-block-head">
            <h2 className="filter-title">O que você procura</h2>
          </div>
          <div className="filters-grid primary-grid">
            <label className="span-all">
              Empresa
              <input
                placeholder="Razão social, nome fantasia ou CNPJ"
                value={filters.q}
                onChange={(e) => update('q', e.target.value)}
              />
            </label>
            <label>
              Nicho
              <input
                list="nichos"
                placeholder="Digite… ex.: Hotelaria, TI, Saúde"
                value={filters.nicho && nichoAtual ? nichoAtual.nome : nichoQuery}
                onChange={(e) => setNichoFromText(e.target.value)}
                onFocus={(e) => e.target.select()}
              />
              <datalist id="nichos">
                {nichosFiltrados.map((n) => (
                  <option key={n.slug} value={n.nome} />
                ))}
              </datalist>
            </label>
            <label>
              Subnicho
              <input
                list="subnichos"
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
              <datalist id="subnichos">
                {subnichosFiltrados.map((f) => (
                  <option key={f.slug} value={f.nome} />
                ))}
              </datalist>
            </label>
          </div>
        </div>

        <div className="filter-block">
          <div className="filter-block-head">
            <h2 className="filter-title">Onde e quem</h2>
          </div>
          <div className="filters-grid local-grid">
            <MultiPick
              label="Estados"
              placeholder="Digite para adicionar… ex.: Rio de Janeiro"
              selected={filters.ufs}
              options={ufOptions}
              onChange={(ufs) => setFilters((prev) => ({ ...prev, ufs }))}
            />
            <MultiPick
              label="Cidades"
              placeholder="Digite ao menos 2 letras… ex.: Piracicaba"
              selected={filters.municipios}
              options={[]}
              loadOptions={loadCityOptions}
              onChange={(municipios) => update('municipios', municipios)}
            />
            <label>
              Natureza
              <select
                value={filters.natureza || `grupo:${filters.natureza_grupo || 'none'}`}
                onChange={(e) => {
                  const v = e.target.value
                  if (v.startsWith('grupo:')) {
                    const g = v.slice(6)
                    update('natureza', '')
                    update('natureza_grupo', g === 'none' ? '' : g)
                  } else {
                    update('natureza', v)
                    update('natureza_grupo', '')
                  }
                }}
              >
                <optgroup label="Grupos">
                  <option value="grupo:alta">Empresas privadas (alta)</option>
                  <option value="grupo:permitidas">Privadas + especiais</option>
                  <option value="grupo:opcional">Só especiais</option>
                  <option value="grupo:none">Qualquer natureza</option>
                </optgroup>
                <optgroup label="Alta prioridade">
                  {naturezasAlta.map((n) => (
                    <option key={n.codigo} value={n.codigo}>
                      {n.descricao}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Especiais">
                  {naturezasOpcional.map((n) => (
                    <option key={n.codigo} value={n.codigo}>
                      {n.descricao}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          </div>

          <div className="porte-field">
            <div className="porte-head">
              <span className="porte-label">Porte da empresa</span>
              <span className="porte-hint">Classificação da Receita Federal</span>
            </div>
            <div className="porte-chips" role="group" aria-label="Porte da empresa">
              <button
                type="button"
                className={`porte-chip ${filters.porte === '' ? 'on' : ''}`}
                onClick={() => update('porte', '')}
              >
                <strong>Todos</strong>
                <span>Sem filtro de porte</span>
              </button>
              <button
                type="button"
                className={`porte-chip ${filters.porte === '01' ? 'on' : ''}`}
                onClick={() => update('porte', '01')}
              >
                <strong>Microempresa</strong>
                <span>ME · faturamento menor</span>
              </button>
              <button
                type="button"
                className={`porte-chip ${filters.porte === '03' ? 'on' : ''}`}
                onClick={() => update('porte', '03')}
              >
                <strong>Pequena empresa</strong>
                <span>EPP · cresceu além da ME</span>
              </button>
              <button
                type="button"
                className={`porte-chip ${filters.porte === '05' ? 'on' : ''}`}
                onClick={() => update('porte', '05')}
              >
                <strong>Médio e grande</strong>
                <span>Demais portes da Receita</span>
              </button>
            </div>
          </div>
        </div>

        <div className="filter-toggles">
          <label className={`toggle-chip ${filters.matriz_apenas ? 'on' : ''}`}>
            <input
              type="checkbox"
              checked={filters.matriz_apenas}
              onChange={(e) => update('matriz_apenas', e.target.checked)}
            />
            Somente matriz
          </label>
          <label className={`toggle-chip ${filters.tem_telefone ? 'on' : ''}`}>
            <input
              type="checkbox"
              checked={filters.tem_telefone}
              onChange={(e) => update('tem_telefone', e.target.checked)}
            />
            Tem telefone
          </label>
        </div>

        <div className="advanced-wrap">
          <button
            type="button"
            className="advanced-toggle"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
          >
            <span>{showAdvanced ? 'Ocultar filtros avançados' : 'Filtros avançados'}</span>
            {advancedCount > 0 && <span className="advanced-badge">{advancedCount}</span>}
            <span className="advanced-chevron">{showAdvanced ? '▾' : '▸'}</span>
          </button>

          {showAdvanced && (
            <div className="advanced-panel">
              <section className="advanced-section">
                <h4 className="advanced-section-title">Contato e abordagem</h4>
                <p className="advanced-section-hint">Refine quem tem canais e decisão de contato</p>
                <div className="filter-toggles">
                  <label className={`toggle-chip ${filters.tem_telefone_2 ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={filters.tem_telefone_2}
                      onChange={(e) => update('tem_telefone_2', e.target.checked)}
                    />
                    Tem 2º telefone
                  </label>
                  <label className={`toggle-chip ${filters.tem_email ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={filters.tem_email}
                      onChange={(e) => update('tem_email', e.target.checked)}
                    />
                    Tem e-mail
                  </label>
                  <label className={`toggle-chip ${filters.tem_socio_admin ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={filters.tem_socio_admin}
                      onChange={(e) => update('tem_socio_admin', e.target.checked)}
                    />
                    Tem sócio-admin
                  </label>
                </div>
              </section>

              <section className="advanced-section">
                <h4 className="advanced-section-title">Atividade e regime</h4>
                <p className="advanced-section-hint">CNAE pontual e opção pelo Simples Nacional</p>
                <div className="filters-grid advanced-grid">
                  <label>
                    CNAE específico
                    <input
                      list="cnaes"
                      placeholder="Código ou descrição"
                      value={filters.cnae}
                      onChange={(e) => update('cnae', e.target.value)}
                    />
                    <datalist id="cnaes">
                      {(meta?.cnaes || []).map((c) => (
                        <option key={c.codigo} value={c.codigo}>
                          {c.descricao}
                        </option>
                      ))}
                    </datalist>
                  </label>
                  <label>
                    Simples Nacional
                    <select
                      value={filters.opcao_simples}
                      onChange={(e) => update('opcao_simples', e.target.value)}
                    >
                      <option value="">Qualquer</option>
                      <option value="S">Sim</option>
                      <option value="N">Não</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="advanced-section">
                <h4 className="advanced-section-title">Capital social</h4>
                <p className="advanced-section-hint">Faixa de capital declarado na Receita</p>
                <div className="filters-grid advanced-grid">
                  <label>
                    Capital mín.
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="R$"
                      value={filters.capital_min}
                      onChange={(e) => update('capital_min', e.target.value)}
                    />
                  </label>
                  <label>
                    Capital máx.
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="R$"
                      value={filters.capital_max}
                      onChange={(e) => update('capital_max', e.target.value)}
                    />
                  </label>
                </div>
              </section>

              <section className="advanced-section">
                <h4 className="advanced-section-title">Tempo de empresa</h4>
                <p className="advanced-section-hint">Data de abertura ou idade em anos</p>
                <div className="filters-grid advanced-grid">
                  <label>
                    Abertura de
                    <input
                      type="date"
                      value={filters.data_inicio_de}
                      onChange={(e) => update('data_inicio_de', e.target.value)}
                    />
                  </label>
                  <label>
                    Abertura até
                    <input
                      type="date"
                      value={filters.data_inicio_ate}
                      onChange={(e) => update('data_inicio_ate', e.target.value)}
                    />
                  </label>
                  <label>
                    Idade mín. (anos)
                    <input
                      type="number"
                      min={0}
                      max={200}
                      placeholder="Ex.: 2"
                      value={filters.idade_min}
                      onChange={(e) => update('idade_min', e.target.value)}
                    />
                  </label>
                  <label>
                    Idade máx. (anos)
                    <input
                      type="number"
                      min={0}
                      max={200}
                      placeholder="Ex.: 15"
                      value={filters.idade_max}
                      onChange={(e) => update('idade_max', e.target.value)}
                    />
                  </label>
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="actions">
          <button type="submit" className="btn primary" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner sm" aria-hidden />
                Buscando…
              </>
            ) : (
              'Buscar prospectos'
            )}
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              clearSavedFilters()
              setFilters(defaultFilters)
              setNichoQuery('')
              setSubnichoQuery('')
              setShowAdvanced(false)
              setItems([])
              setTotal(0)
              setTotalIsCapped(false)
              setSearched(false)
            }}
          >
            Limpar
          </button>
        </div>
      </form>

      {error && <div className="banner error">{error}</div>}

      <section className="panel results" aria-busy={loading}>
        <div className="results-head">
          <div className="results-head-main">
            <h2>Resultados</h2>
            {loading ? (
              <span className="muted searching-label">
                <span className="spinner sm" aria-hidden />
                Consultando a base…
              </span>
            ) : (
              searched && (
                <span className="muted">
                  {totalIsCapped ? 'Mais de ' : ''}
                  {total.toLocaleString('pt-BR')} encontrados · página {filters.page} de{' '}
                  {totalPages}
                </span>
              )
            )}
          </div>
        </div>

        {!searched && !loading && (
          <div className="empty-state">Defina os filtros e busque para ver os prospectos.</div>
        )}

        {loading && (
          <div className="searching-state" role="status" aria-live="polite">
            <span className="spinner" aria-hidden />
            <strong>Buscando prospectos…</strong>
            <p>Consultando empresas na base. Isso pode levar alguns segundos.</p>
          </div>
        )}

        {searched && items.length === 0 && !loading && (
          <div className="empty-state">Nenhum resultado para esses filtros.</div>
        )}

        {!loading && (
        <div className="result-list">
          {items.map((item) => (
            <ProspectResultCardB
              key={item.cnpj}
              item={item}
              sociosOpen={!!sociosOpen[item.cnpj]}
              sociosLoading={!!sociosLoading[item.cnpj]}
              sociosError={sociosError[item.cnpj]}
              socios={sociosCache[item.cnpj]}
              onToggleSocios={() => void toggleSocios(item.cnpj)}
            />
          ))}
        </div>
        )}

        {searched && !loading && totalPages > 1 && (
          <div className="pager">
            <button
              type="button"
              className="btn secondary"
              disabled={filters.page <= 1 || loading}
              onClick={() => goPage(filters.page - 1)}
            >
              Anterior
            </button>
            <button
              type="button"
              className="btn secondary"
              disabled={filters.page >= totalPages || loading}
              onClick={() => goPage(filters.page + 1)}
            >
              Próxima
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export default Prospectos
