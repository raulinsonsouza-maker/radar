import { useEffect, useState, type FormEvent } from 'react'
import {
  createAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  type AuthUser,
} from '../api'
import '../App.css'

export default function AdminUsers() {
  const [users, setUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'cliente' | 'admin'>('cliente')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setUsers(await fetchAdminUsers())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao listar usuários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createAdminUser({
        nome: nome.trim(),
        email: email.trim(),
        password,
        role,
        ativo: true,
      })
      setNome('')
      setEmail('')
      setPassword('')
      setRole('cliente')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar')
    } finally {
      setSaving(false)
    }
  }

  async function toggleAtivo(user: AuthUser) {
    setError(null)
    try {
      await updateAdminUser(user.id, { ativo: !user.ativo })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar')
    }
  }

  async function resetPassword(user: AuthUser) {
    const next = window.prompt(`Nova senha para ${user.email}`, '')
    if (!next || next.length < 6) {
      if (next !== null) setError('Senha deve ter ao menos 6 caracteres')
      return
    }
    setError(null)
    try {
      await updateAdminUser(user.id, { password: next })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao resetar senha')
    }
  }

  return (
    <div className="shell admin-page">
      <div className="panel">
        <div className="results-head">
          <h2>Usuários</h2>
          <span className="muted">{users.length} cadastrados</span>
        </div>

        {error && <div className="banner error">{error}</div>}

        <form className="admin-create" onSubmit={(e) => void onCreate(e)}>
          <h3>Novo usuário</h3>
          <div className="filters-grid">
            <label>
              Nome
              <input required value={nome} onChange={(e) => setNome(e.target.value)} />
            </label>
            <label>
              E-mail
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Senha inicial
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Perfil
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'cliente' | 'admin')}
              >
                <option value="cliente">Cliente</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </div>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Salvando…' : 'Criar usuário'}
          </button>
        </form>
      </div>

      <div className="panel">
        {loading ? (
          <div className="empty-state">Carregando…</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nome}</td>
                    <td className="mono">{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      <span className={`tag ${u.ativo ? 'ok' : 'soft'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="admin-actions">
                      <button
                        type="button"
                        className="btn secondary sm"
                        onClick={() => void toggleAtivo(u)}
                      >
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        className="btn secondary sm"
                        onClick={() => void resetPassword(u)}
                      >
                        Reset senha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
