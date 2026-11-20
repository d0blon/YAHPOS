import { getRootOrigin, getRootOriginSafe } from './root-origin'

export function getRootHost(): string {
  return new URL(getRootOrigin()).host.toLowerCase()
}

export function getRootHostSafe(): string | null {
  const origin = getRootOriginSafe()
  return origin === null ? null : new URL(origin).host.toLowerCase()
}

/** Host raíz configurado (o su www); config inválida → false. */
export function isRootRequestHost(host: string): boolean {
  try {
    const rootHost = new URL(getRootOrigin()).host.toLowerCase()
    const normalized = host.toLowerCase()
    return normalized === rootHost || normalized === `www.${rootHost}`
  } catch {
    return false
  }
}

/** Protocolo de la request, con fallback al origin raíz y fail-closed a https. */
export function getRequestProtocol(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get('x-forwarded-proto')
  if (forwarded !== null) {
    const protocol = (forwarded.split(',')[0] ?? '').trim().toLowerCase()
    if (protocol === 'http' || protocol === 'https') return protocol
  }

  try {
    const protocol = new URL(getRootOrigin()).protocol
    return protocol === 'http:' || protocol === 'https:' ? protocol.slice(0, -1) : 'https'
  } catch {
    return 'https'
  }
}

export function getRootRedirectUrl(path = '/'): string {
  return new URL(path, getRootOrigin()).toString()
}
