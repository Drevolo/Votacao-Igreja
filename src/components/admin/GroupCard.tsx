import { useCallback, useEffect, useState, type FormEvent } from 'react'
import QRCode from 'qrcode'
import { Alert, Badge, Button, Input, Label } from '../ui'
import ResultsPanel from './ResultsPanel'
import { supabase } from '../../lib/supabase'
import type { Candidate, Group, ResultRow, VoteRound } from '../../lib/types'
import { errorMessage, formatDateTime, groupUrl, slugify } from '../../lib/utils'

type Props = {
  group: Group
  onChanged: () => void
}

function CandidateRow({
  candidate,
  onSave,
  onDelete,
}: {
  candidate: Candidate
  onSave: (name: string) => void
  onDelete: () => void
}) {
  const [value, setValue] = useState(candidate.name)

  useEffect(() => setValue(candidate.name), [candidate.name])

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        aria-label={`Nome do candidato ${candidate.name}`}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          const next = value.trim()
          if (next && next !== candidate.name) onSave(next)
          else setValue(candidate.name)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
      />
      <Button variant="ghost" onClick={onDelete} title="Excluir candidato" aria-label={`Excluir ${candidate.name}`}>
        ✕
      </Button>
    </div>
  )
}

export default function GroupCard({ group, onChanged }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [round, setRound] = useState<VoteRound | null>(null)
  const [results, setResults] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [name, setName] = useState(group.name)
  const [slug, setSlug] = useState(group.slug)
  const [editing, setEditing] = useState(false)
  const [newCandidate, setNewCandidate] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => {
    setName(group.name)
    setSlug(group.slug)
  }, [group.name, group.slug])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [candidateRes, roundRes, resultRes] = await Promise.all([
      supabase.from('candidates').select('*').eq('group_id', group.id).order('created_at', { ascending: true }),
      supabase
        .from('rounds')
        .select('*')
        .eq('group_id', group.id)
        .order('number', { ascending: false })
        .limit(1),
      supabase.rpc('get_group_results', { p_group_id: group.id }),
    ])

    if (candidateRes.error) setError(errorMessage(candidateRes.error))
    else setCandidates(candidateRes.data ?? [])

    if (roundRes.error) setError(errorMessage(roundRes.error))
    else setRound((roundRes.data ?? [])[0] ?? null)

    if (resultRes.error) setError(errorMessage(resultRes.error))
    else setResults((resultRes.data ?? []) as ResultRow[])

    setLoading(false)
  }, [group.id])

  useEffect(() => {
    void load()
  }, [load])

  async function withBusy(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  async function saveGroup() {
    const cleanName = name.trim()
    const cleanSlug = slugify(slug)
    if (!cleanName || !cleanSlug) {
      setError('Informe um nome e um código válidos.')
      return
    }
    await withBusy(async () => {
      const { error: updateError } = await supabase
        .from('groups')
        .update({ name: cleanName, slug: cleanSlug })
        .eq('id', group.id)
      if (updateError) {
        setError(errorMessage(updateError, 'Não foi possível salvar. O código pode já estar em uso.'))
        return
      }
      setName(cleanName)
      setSlug(cleanSlug)
      setEditing(false)
      setQr(null)
      setNotice('Dados do grupo salvos.')
      onChanged()
    })
  }

  async function toggleVote() {
    await withBusy(async () => {
      const now = new Date().toISOString()
      let actionError

      if (!round) {
        actionError = (
          await supabase
            .from('rounds')
            .insert({ group_id: group.id, number: 1, is_open: true, opened_at: now })
        ).error
      } else if (round.is_open) {
        actionError = (
          await supabase
            .from('rounds')
            .update({ is_open: false, closed_at: now })
            .eq('id', round.id)
        ).error
      } else {
        actionError = (
          await supabase
            .from('rounds')
            .update({ is_open: true, opened_at: now, closed_at: null })
            .eq('id', round.id)
        ).error
      }

      if (actionError) {
        setError(errorMessage(actionError))
        return
      }
      setNotice(round?.is_open ? 'Seção bloqueada.' : 'Seção liberada para votação.')
      await load()
    })
  }

  async function openNewSession() {
    const next = (round?.number ?? 0) + 1
    if (!window.confirm(`Encerrar a seção atual e abrir o ${next}º escrutínio? A contagem começa do zero.`)) return

    await withBusy(async () => {
      const now = new Date().toISOString()
      if (round) {
        const closeError = (
          await supabase.from('rounds').update({ is_open: false, closed_at: now }).eq('id', round.id)
        ).error
        if (closeError) {
          setError(errorMessage(closeError))
          return
        }
      }
      const insertError = (
        await supabase
          .from('rounds')
          .insert({ group_id: group.id, number: next, is_open: true, opened_at: now })
      ).error
      if (insertError) {
        setError(errorMessage(insertError))
        return
      }
      setNotice(`${next}º escrutínio aberto. A contagem foi zerada.`)
      await load()
    })
  }

  async function addCandidate(event: FormEvent) {
    event.preventDefault()
    const value = newCandidate.trim()
    if (!value) return
    await withBusy(async () => {
      const { error: insertError } = await supabase.from('candidates').insert({ group_id: group.id, name: value })
      if (insertError) {
        setError(errorMessage(insertError))
        return
      }
      setNewCandidate('')
      await load()
    })
  }

  async function saveCandidate(candidate: Candidate, value: string) {
    await withBusy(async () => {
      const { error: updateError } = await supabase.from('candidates').update({ name: value }).eq('id', candidate.id)
      if (updateError) setError(errorMessage(updateError))
      else await load()
    })
  }

  async function deleteCandidate(candidate: Candidate) {
    if (!window.confirm(`Excluir a opção "${candidate.name}"?`)) return
    await withBusy(async () => {
      const { error: deleteError } = await supabase.from('candidates').delete().eq('id', candidate.id)
      if (deleteError) {
        setError('Não é possível excluir uma opção que já recebeu votos.')
        return
      }
      await load()
    })
  }

  async function deleteGroup() {
    if (!window.confirm(`Excluir o grupo "${group.name}" e todos os seus votos?`)) return
    await withBusy(async () => {
      const { error: deleteError } = await supabase.from('groups').delete().eq('id', group.id)
      if (deleteError) setError(errorMessage(deleteError))
      else onChanged()
    })
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(groupUrl(slug))
      setNotice('Link copiado!')
    } catch {
      setNotice(`Link: ${groupUrl(slug)}`)
    }
  }

  async function generateQR() {
    try {
      const dataUrl = await QRCode.toDataURL(groupUrl(slug), {
        width: 600,
        margin: 2,
        color: { dark: '#1e1b4b', light: '#ffffff' },
      })
      setQr(dataUrl)
      setShowQR(true)
    } catch {
      setError('Não foi possível gerar o QR Code.')
    }
  }

  function downloadQR() {
    if (!qr) return
    const link = document.createElement('a')
    link.href = qr
    link.download = `qrcode-${slug}.png`
    link.click()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label>Nome do grupo</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div>
                <Label>Código do link</Label>
                <Input value={slug} onChange={(event) => setSlug(event.target.value)} />
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button onClick={saveGroup} loading={busy} disabled={busy}>Salvar</Button>
                <Button variant="ghost" onClick={() => { setEditing(false); setName(group.name); setSlug(group.slug) }}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-bold text-slate-900">{group.name}</h4>
                <Badge tone={round?.is_open ? 'green' : 'slate'}>
                  {round ? `${round.number}º escrutínio · ${round.is_open ? 'aberto' : 'bloqueado'}` : 'bloqueado'}
                </Badge>
              </div>
              <p className="mt-1 break-all font-mono text-xs text-slate-500">{groupUrl(slug)}</p>
            </>
          )}
        </div>

        {!editing && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>Editar nomes</Button>
            <Button variant="ghost" onClick={deleteGroup} loading={busy}>Excluir</Button>
          </div>
        )}
      </div>

      {!editing && (
        <>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={copyLink}>Copiar link</Button>
            <Button variant="secondary" onClick={generateQR} loading={busy}>QR Code</Button>
            <Button onClick={toggleVote} loading={busy} disabled={busy}>
              {round?.is_open ? 'Bloquear voto' : round ? 'Liberar voto' : 'Liberar voto'}
            </Button>
            <Button variant="secondary" onClick={openNewSession} loading={busy} disabled={busy}>
              Zerar e abrir nova seção
            </Button>
            <Button variant="ghost" onClick={() => setShowResults((value) => !value)}>
              {showResults ? 'Ocultar resultados' : 'Ver resultados'}
            </Button>
          </div>

          {round?.opened_at && (
            <p className="mt-2 text-xs text-slate-400">
              {round.is_open ? 'Aberta em' : 'Última abertura'}: {formatDateTime(round.opened_at)}
            </p>
          )}

          {showQR && qr && (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-xl bg-slate-50 p-5">
              <img src={qr} alt={`QR Code do grupo ${group.name}`} className="h-52 w-52 rounded-lg bg-white p-2" />
              <p className="text-center text-xs text-slate-500">Escaneie para votar neste grupo</p>
              <Button variant="secondary" onClick={downloadQR}>Baixar PNG</Button>
            </div>
          )}

          {showResults && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h4 className="mb-3 text-sm font-bold text-slate-900">Apuração (visível só para o ADM)</h4>
              <ResultsPanel rows={results} loading={loading} />
            </div>
          )}

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-900">Opções de voto (somente nome)</h4>
            <div className="mt-3 space-y-2">
              {candidates.map((candidate) => (
                <CandidateRow
                  key={candidate.id}
                  candidate={candidate}
                  onSave={(value) => saveCandidate(candidate, value)}
                  onDelete={() => deleteCandidate(candidate)}
                />
              ))}
            </div>
            <form onSubmit={addCandidate} className="mt-3 flex gap-2">
              <Input
                value={newCandidate}
                onChange={(event) => setNewCandidate(event.target.value)}
                placeholder="Nome da nova opção"
                aria-label="Nome da nova opção"
              />
              <Button type="submit" variant="secondary" loading={busy} disabled={!newCandidate.trim()}>
                Adicionar
              </Button>
            </form>
          </div>
        </>
      )}

      {error && <div className="mt-4"><Alert tone="rose">{error}</Alert></div>}
      {notice && <div className="mt-4"><Alert tone="green">{notice}</Alert></div>}
    </div>
  )
}
