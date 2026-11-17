import { useEffect, useState, type FormEvent } from 'react'
import ElectionCard from '../components/admin/ElectionCard'
import { Alert, Button, Card, Input, Label, Spinner } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { configIssue, isConfigured, supabase } from '../lib/supabase'
import type { Election } from '../lib/types'
import { errorMessage } from '../lib/utils'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInError) setError('E-mail ou senha incorretos.')
    setLoading(false)
  }

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-14">
      <div className="text-center">
        <span className="text-4xl" aria-hidden="true">⚙️</span>
        <h1 className="mt-4 text-2xl font-black">Área administrativa</h1>
        <p className="mt-2 text-sm text-slate-600">Entre com a conta do administrador da igreja.</p>
      </div>

      <Card className="mt-8 p-6 sm:p-8">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="admin-email">E-mail</Label>
            <Input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@igreja.com"
            />
          </div>
          <div>
            <Label htmlFor="admin-password">Senha</Label>
            <Input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <Alert tone="rose">{error}</Alert>}
          <Button type="submit" className="w-full" loading={loading}>
            Entrar
          </Button>
        </form>
        <p className="mt-5 text-center text-xs text-slate-400">
          O cadastro do administrador é feito no painel do Supabase. Não há cadastro público.
        </p>
      </Card>
    </main>
  )
}

function AdminPanel({ email }: { email: string }) {
  const [elections, setElections] = useState<Election[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadElections() {
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('elections')
      .select('*')
      .order('created_at', { ascending: false })
    if (loadError) setError(errorMessage(loadError))
    else setElections(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void loadElections()
  }, [])

  async function createElection(event: FormEvent) {
    event.preventDefault()
    const clean = title.trim()
    if (!clean) return

    setCreating(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sessão expirada. Entre novamente.')
      setCreating(false)
      return
    }

    const { error: insertError } = await supabase
      .from('elections')
      .insert({ title: clean, owner_id: user.id })

    if (insertError) {
      setError(errorMessage(insertError))
    } else {
      setTitle('')
      await loadElections()
    }
    setCreating(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">Painel de votação</h1>
          <p className="mt-1 text-sm text-slate-600">Conectado como {email}</p>
        </div>
        <Button variant="secondary" onClick={signOut}>Sair</Button>
      </div>

      <Card className="mt-8 p-5 sm:p-6">
        <h2 className="text-base font-bold">Nova votação</h2>
        <p className="mt-1 text-sm text-slate-600">
          Crie um evento independente. Depois adicione os grupos e as opções de cada um.
        </p>
        <form onSubmit={createElection} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex.: Eleição da Diretoria 2026"
            aria-label="Título da nova votação"
          />
          <Button type="submit" loading={creating} disabled={!title.trim()} className="shrink-0">
            Criar votação
          </Button>
        </form>
      </Card>

      {error && <div className="mt-5"><Alert tone="rose">{error}</Alert></div>}

      <div className="mt-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Spinner /> Carregando votações...
          </div>
        ) : elections.length === 0 ? (
          <Card className="p-8 text-center">
            <span className="text-4xl" aria-hidden="true">🗳️</span>
            <p className="mt-3 font-semibold text-slate-700">Nenhuma votação criada ainda</p>
            <p className="mt-1 text-sm text-slate-500">Use o formulário acima para começar.</p>
          </Card>
        ) : (
          elections.map((election) => (
            <ElectionCard key={election.id} election={election} onChanged={loadElections} />
          ))
        )}
      </div>
    </main>
  )
}

export default function AdminPage() {
  const { session, loading } = useAuth()

  if (!isConfigured) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Alert tone="amber">
          Configure o Supabase antes de usar o painel. {configIssue} Veja o README para obter a URL do
          projeto e a chave <strong>anônima/publicável</strong> — nunca use a chave secreta no front-end.
        </Alert>
      </main>
    )
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-slate-500">
        <Spinner className="h-6 w-6 text-brand-600" /> Verificando acesso...
      </main>
    )
  }

  return session ? <AdminPanel email={session.user.email ?? 'administrador'} /> : <LoginForm />
}
