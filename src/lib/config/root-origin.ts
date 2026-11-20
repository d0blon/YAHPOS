export const ROOT_ORIGIN_ENV_VAR = 'NEXT_PUBLIC_ROOT_ORIGIN'

function invalid(reason: string): never {
  throw new Error(`[Config] ${ROOT_ORIGIN_ENV_VAR} inválido: ${reason}. Se requiere un origin HTTP(S) sin path, query ni hash.`)
}

export function getRootOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_ROOT_ORIGIN

  if (typeof configured !== 'string' || configured.trim().length === 0) {
    invalid('variable faltante o vacía')
  }

  let parsed: URL
  try {
    parsed = new URL(configured.trim())
  } catch {
    invalid('no es una URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    invalid('protocolo no HTTP(S)')
  }
  if (parsed.username.length > 0 || parsed.password.length > 0) {
    invalid('credenciales embebidas')
  }
  if (parsed.pathname !== '/' || parsed.search.length > 0 || parsed.hash.length > 0) {
    invalid('contiene path, query o hash')
  }

  return parsed.origin
}

/** Variante no-throwing para callers que deben decidir ante config inválida. */
export function getRootOriginSafe(): string | null {
  try {
    return getRootOrigin()
  } catch {
    return null
  }
}
