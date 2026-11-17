import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Falso quando o arquivo .env.local não foi preenchido. */
export const isConfigured = Boolean(url && anonKey)

/**
 * A chave anônima é pública por design. A segurança real vem das policies RLS
 * e das funções SECURITY DEFINER criadas em supabase/migrations.
 */
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
