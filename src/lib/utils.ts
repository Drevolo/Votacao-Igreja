export function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'votacao'
  )
}

/** Aceita tanto o código (saf) quanto o link completo (.../v/saf). */
export function extractSlug(value: string): string {
  const trimmed = value.trim()
  const match = trimmed.match(/\/v\/([^/?#]+)/)
  return slugify(match ? match[1] : trimmed)
}

export function groupUrl(slug: string): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${window.location.origin}${base.replace(/\/$/, '')}/v/${slug}`
}

export function errorMessage(error: unknown, fallback = 'Não foi possível concluir. Tente novamente.'): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  if (typeof error === 'string' && error.trim()) return error
  return fallback
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
