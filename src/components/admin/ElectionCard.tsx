import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Alert, Badge, Button, Card, Input, Label } from '../ui'
import GroupCard from './GroupCard'
import { supabase } from '../../lib/supabase'
import type { Election, Group } from '../../lib/types'
import { errorMessage, formatDateTime, slugify } from '../../lib/utils'

export default function ElectionCard({ election, onChanged }: { election: Election; onChanged: () => void }) {
  const [groups, setGroups] = useState<Group[]>([])
  const [title, setTitle] = useState(election.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadGroups = useCallback(async () => {
    setLoading(true)
    const { data, error: loadError } = await supabase
      .from('groups')
      .select('*')
      .eq('election_id', election.id)
      .order('created_at', { ascending: true })

    if (loadError) setError(errorMessage(loadError))
    else setGroups(data ?? [])
    setLoading(false)
  }, [election.id])

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  async function saveTitle() {
    const clean = title.trim()
    if (!clean) {
      setError('O título não pode ficar vazio.')
      return
    }
    setBusy(true)
    setError(null)
    const { error: updateError } = await supabase.from('elections').update({ title: clean }).eq('id', election.id)
    setBusy(false)
    if (updateError) {
      setError(errorMessage(updateError))
      return
    }
    setEditingTitle(false)
    onChanged()
  }

  async function addGroup(event: FormEvent) {
    event.preventDefault()
    const cleanName = newName.trim()
    if (!cleanName) return

    const baseSlug = slugify(newSlug || cleanName)
    let chosen = baseSlug
    setBusy(true)
    setError(null)

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { error: insertError } = await supabase.from('groups').insert({
        election_id: election.id,
        name: cleanName,
        slug: chosen,
      })

      if (!insertError) {
        setNewName('')
        setNewSlug('')
        setSlugEdited(false)
        setBusy(false)
        await loadGroups()
        return
      }

      if (insertError.code === '23505') {
        chosen = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
        continue
      }

      setError(errorMessage(insertError))
      setBusy(false)
      return
    }

    setError('Não foi possível gerar um código único. Tente outro código.')
    setBusy(false)
  }

  async function deleteElection() {
    if (!window.confirm(`Excluir a votação "${election.title}" e todos os seus grupos e votos?`)) return
    setBusy(true)
    const { error: deleteError } = await supabase.from('elections').delete().eq('id', election.id)
    setBusy(false)
    if (deleteError) setError(errorMessage(deleteError))
    else onChanged()
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editingTitle ? (
              <div className="flex gap-2">
                <Input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Título da votação" />
                <Button onClick={saveTitle} loading={busy}>Salvar</Button>
                <Button variant="ghost" onClick={() => { setEditingTitle(false); setTitle(election.title) }}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900">{election.title}</h3>
                  <Badge tone="blue">Votação</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Criada em {formatDateTime(election.created_at)} · {groups.length}{' '}
                  {groups.length === 1 ? 'grupo' : 'grupos'}
                </p>
              </>
            )}
          </div>

          {!editingTitle && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditingTitle(true)}>Renomear</Button>
              <Button variant="ghost" onClick={deleteElection} loading={busy}>Excluir</Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 p-5">
        {loading ? (
          <p className="text-sm text-slate-500">Carregando grupos...</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum grupo cadastrado. Crie o primeiro abaixo.</p>
        ) : (
          groups.map((group) => <GroupCard key={group.id} group={group} onChanged={loadGroups} />)
        )}

        <form onSubmit={addGroup} className="rounded-xl border border-dashed border-slate-300 p-4">
          <p className="mb-3 text-sm font-bold text-slate-700">Adicionar grupo (ex.: SAF, UMP)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Nome do grupo</Label>
              <Input
                value={newName}
                onChange={(event) => {
                  setNewName(event.target.value)
                  if (!slugEdited) setNewSlug(slugify(event.target.value))
                }}
                placeholder="SAF"
              />
            </div>
            <div>
              <Label>Código do link</Label>
              <Input
                value={newSlug}
                onChange={(event) => {
                  setSlugEdited(true)
                  setNewSlug(slugify(event.target.value))
                }}
                placeholder="saf"
              />
            </div>
          </div>
          <Button type="submit" className="mt-3" loading={busy} disabled={!newName.trim()}>
            Criar grupo e link
          </Button>
        </form>

        {error && <Alert tone="rose">{error}</Alert>}
      </div>
    </Card>
  )
}
