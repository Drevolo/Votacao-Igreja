import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function normalizeUrl(value?: string): string | null {
  const trimmed = value?.trim()
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null
  try {
    return new URL(trimmed).toString()
  } catch {
    return null
  }
}

const url = normalizeUrl(rawUrl)
const key = rawKey?.trim() || null

/** Falso quando a configuração não foi preenchida ou está inválida. */
export const isConfigured = Boolean(url && key)

/** Descreve o problema quando há configuração, mas ela não é válida. */
export const configIssue = rawUrl || rawKey
  ? !url
    ? 'VITE_SUPABASE_URL não é uma URL válida (deve começar com https://).'
    : !key
      ? 'VITE_SUPABASE_ANON_KEY está vazia.'
      : null
  : 'Variáveis de ambiente do Supabase não preenchidas.'

let client: SupabaseClient | null = null

try {
  if (url && key) {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
} catch (error) {
  console.error('Falha ao iniciar o Supabase:', error)
}

// Cliente inofensivo usado apenas enquanto a configuração não está correta.
// As páginas verificam `isConfigured` antes de fazer qualquer chamada.
export const supabase: SupabaseClient =
  client ??
  createClient('https://placeholder.supabase.co', 'placeholder-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
  })

/**
 * Cliente usado pela área do eleitor. Tem uma chave de armazenamento própria e
 * não persiste sessão, garantindo que as chamadas públicas (get_voting_group,
 * cast_vote) sejam sempre feitas como `anon`, mesmo que o administrador esteja
 * logado no mesmo navegador.
 */
export const publicSupabase: SupabaseClient = createClient(
  url ?? 'https://placeholder.supabase.co',
  key ?? 'placeholder-anon-key',
  {
    auth: {
      storageKey: 'votacao-igreja-public',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
)
