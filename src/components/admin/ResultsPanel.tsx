import type { ResultRow } from '../../lib/types'
import { Badge, Spinner } from '../ui'

export default function ResultsPanel({ rows, loading }: { rows: ResultRow[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
        <Spinner /> Carregando apuração...
      </div>
    )
  }

  if (rows.length === 0) {
    return <p className="py-4 text-sm text-slate-500">Ainda não há votos registrados.</p>
  }

  const roundNumbers = Array.from(new Set(rows.map((row) => Number(row.round_number)))).sort((a, b) => b - a)

  return (
    <div className="space-y-6">
      {roundNumbers.map((roundNumber) => {
        const roundRows = rows.filter((row) => Number(row.round_number) === roundNumber)
        const total = roundRows.reduce((sum, row) => sum + Number(row.votes), 0)
        const isOpen = roundRows.some((row) => row.is_open)

        return (
          <div key={roundNumber} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900">{roundNumber}º escrutínio</h4>
              <Badge tone={isOpen ? 'green' : 'slate'}>{isOpen ? 'Seção aberta' : 'Encerrada'}</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {roundRows.map((row) => {
                const votes = Number(row.votes)
                const percent = total > 0 ? Math.round((votes / total) * 100) : 0
                return (
                  <div key={row.candidate_id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-800">{row.candidate_name}</span>
                      <span className="shrink-0 text-slate-600">
                        <strong className="text-slate-900">{votes}</strong> {votes === 1 ? 'voto' : 'votos'} · {percent}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="mt-4 border-t border-slate-200 pt-2 text-xs text-slate-500">
              Total da seção: <strong>{total}</strong> {total === 1 ? 'voto' : 'votos'}
            </p>
          </div>
        )
      })}
    </div>
  )
}
