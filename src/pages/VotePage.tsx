import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Button, Card, Input, Label, Spinner } from '../components/ui'
import { publicSupabase } from '../lib/supabase'
import type { CastVoteResult, VotingGroup } from '../lib/types'
import { errorMessage } from '../lib/utils'

const ERROR_MESSAGES: Record<string, string> = {
  closed: 'A votação deste grupo está bloqueada no momento. Aguarde o administrador liberar uma nova seção.',
  duplicate:
    'Este e-mail já votou neste escrutínio. Você poderá votar novamente quando o administrador abrir uma nova seção.',
  invalid_email: 'Informe um e-mail válido para continuar.',
  invalid_candidate: 'Candidato inválido. Atualize a página e tente novamente.',
  too_many: 'Muitas tentativas em sequência. Aguarde alguns segundos e tente novamente.',
}

export default function VotePage() {
  const { slug } = useParams()
  const [data, setData] = useState<VotingGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CastVoteResult | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)

    publicSupabase
      .rpc('get_voting_group', { p_slug: (slug ?? '').toLowerCase() })
      .then(({ data: payload, error }) => {
        if (!active) return
        if (error) {
          console.error('Falha ao carregar votação:', error)
          setLoadError(`Não foi possível carregar a votação. ${error.message}`)
        } else if (!payload) {
          setLoadError('Link de votação não encontrado. Confira o QR Code ou o endereço recebido.')
        } else {
          setData(payload as VotingGroup)
        }
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [slug])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!data || !selected || !email.trim()) return

    setSubmitting(true)
    setResult(null)
    setSubmitError(null)

    const { data: payload, error } = await publicSupabase.rpc('cast_vote', {
      p_group_id: data.group.id,
      p_candidate_id: selected,
      p_email: email.trim(),
    })

    if (error) {
      setSubmitError(errorMessage(error))
    } else {
      setResult(payload as CastVoteResult)
    }
    setSubmitting(false)
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500">
        <Spinner className="h-8 w-8 text-brand-600" />
        <p className="text-sm">Carregando votação...</p>
      </main>
    )
  }

  if (loadError || !data) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20">
        <Alert tone="rose">{loadError ?? 'Votação indisponível.'}</Alert>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:underline">
          Voltar ao início
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-800 px-6 py-8 text-white shadow-lg sm:px-10">
        <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          {data.group.election_title}
        </span>
        <h1 className="mt-4 text-3xl font-black sm:text-4xl">Votação · {data.group.name}</h1>
      </div>

      <div className="mt-6">
        {!data.open ? (
          <Card className="p-6 sm:p-8">
            <div className="text-center">
              <span className="text-4xl" aria-hidden="true">🔒</span>
              <h2 className="mt-4 text-xl font-bold">Votação não iniciada ou encerrada</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                O administrador ainda não liberou esta seção, ou ela já foi encerrada. Aguarde a abertura de uma
                nova seção para votar.
              </p>
            </div>
          </Card>
        ) : result?.ok ? (
          <Card className="border-emerald-200 p-6 text-center sm:p-10">
            <span className="text-5xl" aria-hidden="true">✅</span>
            <h2 className="mt-4 text-2xl font-black text-emerald-700">Voto registrado!</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              Seu voto foi computado neste escrutínio. Os resultados ficam disponíveis somente para o
              administrador. Você pode fechar esta página.
            </p>
            <p className="mt-4 text-xs text-slate-400">Seção {result.round}</p>
          </Card>
        ) : (
          <Card className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email">Seu e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@igreja.com"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Usado somente para identificar votos repetidos. Não é armazenado em texto puro.
                </p>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700">Escolha uma opção</legend>
                <div className="space-y-2">
                  {data.candidates.map((candidate) => (
                    <label
                      key={candidate.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 text-sm transition ${
                        selected === candidate.id
                          ? 'border-brand-500 bg-brand-50 font-semibold text-brand-900 ring-1 ring-brand-500'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="candidate"
                        value={candidate.id}
                        checked={selected === candidate.id}
                        onChange={() => {
                          setSelected(candidate.id)
                          setResult(null)
                        }}
                        className="h-4 w-4 accent-brand-600"
                      />
                      {candidate.name}
                    </label>
                  ))}
                  {data.candidates.length === 0 && (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Nenhuma opção cadastrada para este grupo.
                    </p>
                  )}
                </div>
              </fieldset>

              {submitError && <Alert tone="rose">{submitError}</Alert>}
              {result && !result.ok && (
                <Alert tone="rose">
                  {result.error ? ERROR_MESSAGES[result.error] ?? 'Não foi possível registrar seu voto.' : 'Não foi possível registrar seu voto.'}
                </Alert>
              )}

              <Button type="submit" className="w-full" size="lg" loading={submitting} disabled={!selected || !email.trim()}>
                Confirmar voto
              </Button>
            </form>
          </Card>
        )}
      </div>
    </main>
  )
}
