import { Link, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import VotePage from './pages/VotePage'
import { configIssue, isConfigured } from './lib/supabase'

function ConfigWarning() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-sm text-amber-900">
      <strong>Configuração do Supabase pendente:</strong> {configIssue} Confira os secrets do repositório
      e o README.
    </div>
  )
}

function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-6xl font-black text-brand-600">404</p>
      <h1 className="mt-4 text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-slate-600">O endereço acessado não existe.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Voltar ao início
      </Link>
    </main>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {!isConfigured && <ConfigWarning />}

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/v/:slug" element={<VotePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        Votação da Igreja
      </footer>
    </div>
  )
}
