// Som tocado quando o voto é registrado com sucesso.
// Os arquivos ficam em public/sounds/ — veja o README dessa pasta para trocar.
const SOUND_FILES = [
  'sounds/confirm.mp4',
  'sounds/confirm.m4a',
  'sounds/confirm.mp3',
  'sounds/confirm.wav',
] as const

function assetUrl(file: string) {
  const base = import.meta.env.BASE_URL || '/'
  return `${base.endsWith('/') ? base : `${base}/`}${file}`
}

let lastPlayedAt = 0

/**
 * Tenta tocar o som de confirmação. Se o arquivo não existir ou o navegador
 * bloquear a reprodução, não faz nada — o voto já foi registrado normalmente.
 */
export function playVoteConfirmationSound() {
  const now = Date.now()
  if (now - lastPlayedAt < 1000) return
  lastPlayedAt = now

  let index = 0

  const tryNext = () => {
    if (index >= SOUND_FILES.length) return
    const file = SOUND_FILES[index++]
    const audio = new Audio(assetUrl(file))
    audio.volume = 0.8

    let settled = false
    const next = () => {
      if (settled) return
      settled = true
      tryNext()
    }

    audio.addEventListener('error', next, { once: true })
    void audio.play().then(() => { settled = true }).catch(next)
  }

  tryNext()
}
