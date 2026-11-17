import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Input, Label } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { extractSlug } from '../lib/utils'

export default function HomePage() {
  const [tab, setTab] = useState<'votar' | 'admin'>('votar')
  const [code, setCode] = useState('')
  const navigate = useNavigate()
  const { session, loading } = useAuth()

  function handleAccess(event: FormEvent) {
    event.preventDefault()
    const slug = extractSlug(code)
    if (slug) navigate(`/v/${slug}`)
  }

  const tabs = [
    { id: 'votar' as const, label: 'Área do eleitor', icon: '🗳️' },
    { id: 'admin' as const, label: 'Administração', icon: '⚙️' },
  ]

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-16">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/20">
          VOTAÇÃO DA IGREJA
        </span>
        <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
          Vote de forma simples e segura
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
          Cada grupo recebe um link e um QR Code próprios. Seu voto é anônimo — o e-mail serve apenas para
          impedir votos duplicados dentro de cada escrutínio.
        </p>
      </div>

      <div className="mt-10 flex justify-center">
        <div className="inline-flex rounded-xl bg-slate-200/70 p-1" role="tablist" aria-label="Áreas do sistema">
          {tabs.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition sm:px-6 ${
                tab === item.id ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="mr-1.5" aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="mx-auto mt-6 max-w-xl p-6 sm:p-8">
        {tab === 'votar' ? (
          <div role="tabpanel">
            <h2 className="text-xl font-bold">Acessar minha votação</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Escaneie o QR Code recebido ou digite o código do seu grupo (ex.: <strong>saf</strong>).
            </p>
            <form onSubmit={handleAccess} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="codigo">Código ou link do grupo</Label>
                <Input
                  id="codigo"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="saf"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" className="w-full" disabled={!code.trim()}>
                Continuar para a votação
              </Button>
            </form>
          </div>
        ) : (
          <div role="tabpanel">
            <h2 className="text-xl font-bold">Painel administrativo</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              {loading
                ? 'Verificando seu acesso...'
                : session
                  ? `Conectado como ${session.user.email}.`
                  : 'Entre com sua conta para criar votações, gerar links e acompanhar os resultados.'}
            </p>
            <Link
              to="/admin"
              className="mt-6 block w-full rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              {session ? 'Abrir painel' : 'Fazer login'}
            </Link>
          </div>
        )}
      </Card>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: '🔗', title: 'Link por grupo', text: 'Um endereço exclusivo para SAF, UMP e demais grupos.' },
          { icon: '📱', title: 'QR Code automático', text: 'Gerado a partir do link e pronto para compartilhar.' },
          { icon: '🔒', title: 'Voto único por seção', text: 'O e-mail impede duplicidade sem revelar quem votou.' },
        ].map((item) => (
          <Card key={item.title} className="p-5">
            <span className="text-2xl" aria-hidden="true">{item.icon}</span>
            <h3 className="mt-3 font-bold text-slate-900">{item.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{item.text}</p>
          </Card>
        ))}
      </div>
    </main>
  )
}
