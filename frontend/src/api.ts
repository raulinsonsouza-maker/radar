export type NichoFilho = {
  slug: string
  nome: string
  nome_oficial?: string | null
}

export type Nicho = {
  slug: string
  nome: string
  nome_oficial?: string | null
  filhos: NichoFilho[]
}

export type NaturezaMeta = {
  codigo: string
  descricao: string
  nome: string
  grupo: 'alta' | 'opcional'
}

export type MetaResponse = {
  ufs: string[]
  naturezas: NaturezaMeta[]
  nichos: Nicho[]
  municipios: { codigo: string; nome: string; uf: string; qtd: number }[]
  cnaes: { codigo: string; descricao: string; qtd: number }[]
  motivos: { codigo: string; descricao: string }[]
  portes: { codigo: string; descricao: string }[]
  situacoes: { codigo: string; descricao: string }[]
}

export type Prospecto = {
  cnpj: string
  cnpj_basico?: string | null
  razao_social?: string | null
  nome_fantasia?: string | null
  porte?: string | null
  porte_descricao?: string | null
  capital_social?: number | null
  natureza_juridica?: string | null
  natureza_descricao?: string | null
  situacao_descricao?: string | null
  motivo_descricao?: string | null
  cnae_fiscal_principal?: string | null
  cnae_descricao?: string | null
  cnae_fiscal_secundaria?: string | null
  uf?: string | null
  municipio_nome?: string | null
  telefone?: string | null
  telefone_2?: string | null
  email?: string | null
  opcao_simples?: string | null
  data_inicio_atividade?: string | null
  idade_anos?: number | null
  qtd_socios?: number | null
  qtd_filiais?: number | null
  socio_admin_nome?: string | null
  tipo_estabelecimento?: string | null
  bairro?: string | null
  logradouro?: string | null
  numero?: string | null
  cep?: string | null
}

/** Naturezas em que o "dono" costuma ser a própria razão social (sem quadro societário). */
export const NATUREZAS_TITULAR = new Set([
  '2135', // Empresário Individual
  '4014', // Empresa Individual Imobiliária
  '2305', // EIRELI
  '2313', // EIRELI Simples
  '2321', // Sociedade Unipessoal de Advocacia
])

export function isNaturezaTitular(codigo?: string | null): boolean {
  return !!codigo && NATUREZAS_TITULAR.has(codigo)
}

/** Nome do decisor: sócio-admin, ou titular (razão social) em EI/EIRELI sem sócios. */
export function nomeDecisor(item: Prospecto): {
  nome: string | null
  tipo: 'admin' | 'titular' | null
} {
  if (item.socio_admin_nome) return { nome: item.socio_admin_nome, tipo: 'admin' }
  if (
    (item.qtd_socios ?? 0) === 0 &&
    isNaturezaTitular(item.natureza_juridica) &&
    item.razao_social
  ) {
    return { nome: item.razao_social, tipo: 'titular' }
  }
  return { nome: null, tipo: null }
}

export type Socio = {
  nome_socio?: string | null
  cnpj_cpf_socio?: string | null
  identificador_socio?: string | null
  tipo_socio?: string | null
  qualificacao_socio?: string | null
  qualificacao_descricao?: string | null
  eh_admin?: boolean
  data_entrada_sociedade?: string | null
  pais?: string | null
  pais_nome?: string | null
  faixa_etaria?: string | null
  faixa_etaria_descricao?: string | null
  nome_representante?: string | null
  qualificacao_representante_legal?: string | null
  qualificacao_representante_descricao?: string | null
}

export type SearchResponse = {
  total: number
  total_is_capped?: boolean
  page: number
  page_size: number
  items: Prospecto[]
}

export type Filters = {
  q: string
  situacao: string
  ufs: string[]
  municipios: string[]
  nicho: string
  subnicho: string
  cnae: string
  natureza: string
  natureza_grupo: string
  porte: string
  opcao_simples: string
  capital_min: string
  capital_max: string
  data_inicio_de: string
  data_inicio_ate: string
  idade_min: string
  idade_max: string
  tem_telefone: boolean
  tem_telefone_2: boolean
  tem_email: boolean
  tem_socio_admin: boolean
  matriz_apenas: boolean
  page: number
  page_size: number
}

/** Preset padrão: ativas (sempre — BD só tem ativas), privadas alta, matriz, com telefone */
export const defaultFilters: Filters = {
  q: '',
  situacao: '02',
  ufs: [],
  municipios: [],
  nicho: '',
  subnicho: '',
  cnae: '',
  natureza: '',
  natureza_grupo: 'alta',
  porte: '',
  opcao_simples: '',
  capital_min: '',
  capital_max: '',
  data_inicio_de: '',
  data_inicio_ate: '',
  idade_min: '',
  idade_max: '',
  tem_telefone: true,
  tem_telefone_2: false,
  tem_email: false,
  tem_socio_admin: false,
  matriz_apenas: true,
  page: 1,
  page_size: 25,
}

export const UF_NOMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
}

export function nomeUf(sigla: string): string {
  return UF_NOMES[sigla.toUpperCase()] || sigla
}

const FILTERS_STORAGE_KEY = 'prospeccao.filters.v2'

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

export function loadSavedFilters(): Filters {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY)
    if (!raw) return { ...defaultFilters }
    const parsed = JSON.parse(raw) as Partial<Filters> & { uf?: string; municipio?: string }
    return {
      ...defaultFilters,
      ...parsed,
      situacao: '02',
      ufs: asStringList(parsed.ufs ?? parsed.uf),
      municipios: asStringList(parsed.municipios ?? parsed.municipio),
      page: typeof parsed.page === 'number' && parsed.page > 0 ? parsed.page : 1,
      page_size:
        typeof parsed.page_size === 'number' && parsed.page_size > 0
          ? parsed.page_size
          : defaultFilters.page_size,
    }
  } catch {
    return { ...defaultFilters }
  }
}

export function saveFilters(filters: Filters): void {
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
  } catch {
    // ignore quota / private mode
  }
}

export function clearSavedFilters(): void {
  try {
    localStorage.removeItem(FILTERS_STORAGE_KEY)
  } catch {
    // ignore
  }
}

function toParams(filters: Filters, forExport = false): URLSearchParams {
  const p = new URLSearchParams()
  const nichoSlug = filters.subnicho || filters.nicho

  const entries: [string, string | number | boolean][] = [
    ['q', filters.q],
    ['situacao', '02'],
    ['nicho', nichoSlug],
    ['cnae', filters.cnae],
    ['natureza', filters.natureza],
    ['natureza_grupo', filters.natureza ? '' : filters.natureza_grupo],
    ['porte', filters.porte],
    ['opcao_simples', filters.opcao_simples],
    ['capital_min', filters.capital_min],
    ['capital_max', filters.capital_max],
    ['data_inicio_de', filters.data_inicio_de],
    ['data_inicio_ate', filters.data_inicio_ate],
    ['idade_min', filters.idade_min],
    ['idade_max', filters.idade_max],
  ]

  for (const [key, value] of entries) {
    if (value !== '' && value !== null && value !== undefined) {
      p.set(key, String(value))
    }
  }

  for (const uf of filters.ufs) p.append('uf', uf)
  for (const mun of filters.municipios) p.append('municipio', mun)

  if (filters.tem_telefone) p.set('tem_telefone', 'true')
  if (filters.tem_telefone_2) p.set('tem_telefone_2', 'true')
  if (filters.tem_email) p.set('tem_email', 'true')
  if (filters.tem_socio_admin) p.set('tem_socio_admin', 'true')
  p.set('matriz_apenas', String(filters.matriz_apenas))

  if (!forExport) {
    p.set('page', String(filters.page))
    p.set('page_size', String(filters.page_size))
  } else {
    p.set('limit', '10000')
  }

  return p
}

const TOKEN_KEY = 'prospeccao.token'
const USER_KEY = 'prospeccao.user'

export type AuthUser = {
  id: number
  email: string
  nome: string
  role: 'admin' | 'cliente' | string
  ativo: boolean
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {})
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(input, { ...init, headers })
  if (res.status === 401) {
    clearSession()
  }
  return res
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<{ access_token: string; user: AuthUser }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    let detail = 'Falha no login'
    try {
      const data = await res.json()
      detail = data.detail || detail
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === 'string' ? detail : 'Falha no login')
  }
  return res.json()
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await apiFetch('/api/auth/me')
  if (!res.ok) throw new Error('Sessão inválida')
  return res.json()
}

export async function fetchAdminUsers(): Promise<AuthUser[]> {
  const res = await apiFetch('/api/admin/usuarios')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function createAdminUser(payload: {
  email: string
  nome: string
  password: string
  role?: string
  ativo?: boolean
}): Promise<AuthUser> {
  const res = await apiFetch('/api/admin/usuarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    let detail = 'Falha ao criar usuário'
    try {
      const data = await res.json()
      detail = data.detail || detail
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === 'string' ? detail : 'Falha ao criar usuário')
  }
  return res.json()
}

export async function updateAdminUser(
  id: number,
  payload: { nome?: string; ativo?: boolean; password?: string; role?: string },
): Promise<AuthUser> {
  const res = await apiFetch(`/api/admin/usuarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchMeta(): Promise<MetaResponse> {
  const res = await apiFetch('/api/meta')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export type MunicipioOption = {
  codigo: string
  nome: string
  uf: string
  qtd?: number
}

export async function searchMunicipios(
  q: string,
  ufs: string[] = [],
): Promise<MunicipioOption[]> {
  const term = q.trim()
  if (term.length < 1) return []
  const p = new URLSearchParams()
  p.set('q', term)
  for (const uf of ufs) p.append('uf', uf)
  const res = await apiFetch(`/api/municipios?${p}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchProspectos(filters: Filters): Promise<SearchResponse> {
  const res = await apiFetch(`/api/prospectos?${toParams(filters)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchSocios(cnpj: string): Promise<Socio[]> {
  const digits = cnpj.replace(/\D/g, '')
  const res = await apiFetch(`/api/prospectos/${encodeURIComponent(digits)}/socios`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '').padStart(14, '0')
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

export function formatMoney(value?: number | null): string {
  if (value == null) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(value?: string | null): string {
  if (!value) return '—'
  const [y, m, d] = value.split('-')
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}

export function formatIdade(anos?: number | null): string {
  if (anos == null) return '—'
  if (anos === 0) return 'Menos de 1 ano'
  if (anos === 1) return '1 ano'
  return `${anos} anos`
}

export function formatCep(cep?: string | null): string {
  if (!cep) return ''
  const d = cep.replace(/\D/g, '')
  if (d.length !== 8) return cep
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export function formatPhone(phone?: string | null): string {
  if (!phone) return ''
  const parts = phone.trim().split(/\s+/)
  if (parts.length < 2) return phone
  const ddd = parts[0]
  const num = parts.slice(1).join('').replace(/\D/g, '')
  if (num.length === 9) return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`
  if (num.length === 8) return `(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`
  return phone
}

const PORTE_AMIGAVEL: Record<string, string> = {
  '00': 'Não informado',
  '01': 'Microempresa (ME)',
  '03': 'Pequena empresa (EPP)',
  '05': 'Médio e grande',
}

export function formatPorte(codigo?: string | null, fallback?: string | null): string {
  if (codigo && PORTE_AMIGAVEL[codigo]) return PORTE_AMIGAVEL[codigo]
  return fallback || '—'
}

/** Extrai só dígitos do telefone (DDD + número). */
export function phoneDigits(phone?: string | null): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/**
 * Normaliza para WhatsApp BR: 55 + DDD + número (11 dígitos locais).
 * Celular antigo (8 dígitos começando com 6–9) ganha o nono dígito.
 */
export function normalizeWhatsappBr(phone?: string | null): string | null {
  let d = phoneDigits(phone)
  if (!d) return null

  if (d.startsWith('55') && d.length >= 12) {
    d = d.slice(2)
  }

  if (d.length === 10 && '6789'.includes(d[2])) {
    // Celular no formato antigo → inclui o 9
    d = `${d.slice(0, 2)}9${d.slice(2)}`
  }

  if (d.length === 10) {
    // Fixo: ainda gera link (alguns usam no WhatsApp Business)
    return `55${d}`
  }

  if (d.length === 11) return `55${d}`
  return null
}

/** Celular / número utilizável no WhatsApp. */
export function isCelularBr(phone?: string | null): boolean {
  return normalizeWhatsappBr(phone) != null
}

/** Link wa.me com DDI 55. */
export function whatsappUrl(phone?: string | null): string | null {
  const d = normalizeWhatsappBr(phone)
  if (!d) return null
  return `https://wa.me/${d}`
}

/**
 * Busca Google só da empresa: Meu Negócio, site, redes da marca, CNPJ/Econodata.
 * Usa nome fantasia / marca curta — não mistura sócios/decisor.
 */
export function googleResearchUrl(item: Prospecto): string {
  const razao = item.razao_social?.trim()
  const fantasia = item.nome_fantasia?.trim()
  const municipio = item.municipio_nome?.trim()
  const uf = item.uf?.trim()

  const brand =
    fantasia
      ?.split(/[\s&/\-|,]+/)
      .map((w) => w.trim())
      .find((w) => w.length >= 4 && !/^(ltda|me|eireli|sa|epp)$/i.test(w)) || null

  const parts: string[] = []

  // Âncora da marca (fantasia > marca curta > razão social)
  if (brand) parts.push(brand)
  if (fantasia && fantasia.toLowerCase() !== brand?.toLowerCase()) {
    parts.push(`"${fantasia}"`)
  } else if (!fantasia && razao) {
    parts.push(`"${razao}"`)
  }

  if (municipio && uf) parts.push(`"${municipio}" ${uf}`)
  else if (municipio) parts.push(`"${municipio}"`)
  else if (uf) parts.push(uf)

  parts.push('(site OR Instagram OR Facebook OR LinkedIn OR "Google Meu Negócio" OR empresa)')

  const digits = (item.cnpj || '').replace(/\D/g, '')
  if (digits.length === 14) {
    parts.push(`("${formatCnpj(digits)}" OR Econodata OR Serasa)`)
  } else {
    parts.push('(Econodata OR Serasa)')
  }

  return `https://www.google.com/search?q=${encodeURIComponent(parts.join(' '))}`
}

/**
 * Busca Google da pessoa (decisor/sócio/dono): só LinkedIn / Instagram / Facebook.
 * Exclui diretórios de CNPJ e gera variantes do nome (ex.: Silvana Galloni Martins).
 */
export function googlePersonResearchUrl(
  nome: string,
  opts?: {
    municipio?: string | null
    uf?: string | null
    empresa?: string | null
  },
): string | null {
  const name = nome?.trim()
  if (!name) return null

  const nameParts = name.split(/\s+/).filter(Boolean)
  const variants = new Set<string>([name])
  if (nameParts.length >= 3) {
    // Sem nomes do meio: Silvana Galloni Martins
    variants.add(`${nameParts[0]} ${nameParts[nameParts.length - 2]} ${nameParts[nameParts.length - 1]}`)
    // Primeiro + último: Silvana Martins
    variants.add(`${nameParts[0]} ${nameParts[nameParts.length - 1]}`)
  }

  const nameClause = [...variants].map((v) => `"${v}"`).join(' OR ')
  const parts: string[] = [`(${nameClause})`]

  // Marca curta da empresa só para desambiguar (fantasia longa puxa Serasa/CNPJ Biz)
  const empresa = opts?.empresa?.trim()
  if (empresa && empresa.toLowerCase() !== name.toLowerCase()) {
    const brand = empresa
      .split(/[\s&/\-|,]+/)
      .map((w) => w.trim())
      .find((w) => w.length >= 4 && !/^(ltda|me|eireli|sa|epp)$/i.test(w))
    if (brand) parts.push(brand)
  }

  const municipio = opts?.municipio?.trim()
  const uf = opts?.uf?.trim()
  if (municipio && uf) parts.push(`"${municipio}" ${uf}`)
  else if (municipio) parts.push(`"${municipio}"`)

  // Apenas domínios de rede — sem "LinkedIn OR Instagram" soltos (isso libera diretórios)
  parts.push('(site:linkedin.com OR site:br.linkedin.com OR site:instagram.com OR site:facebook.com)')

  parts.push(
    '-site:cnpj.biz -site:econodata.com.br -site:serasaexperian.com.br -site:casadosdados.com.br -site:cnpja.com -site:cnpj.info',
  )

  return `https://www.google.com/search?q=${encodeURIComponent(parts.join(' '))}`
}
