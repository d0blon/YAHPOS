import { getRootOrigin } from '@/lib/config/root-origin'
import { createClient } from '@/lib/supabase'

export { isRootRequestHost } from '@/lib/config/root-domain'

const MAX_NEXT_LENGTH = 2048
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/
const ENCODED_SEPARATORS = /%5c|%2f%2f/i

export type TrustedStore = {
  id: string
  subdomain: string | null
  custom_domain: string | null
}

export type TrustedOrigin = {
  origin: string
  host: string
  store: TrustedStore | null
}

type StoreByDomainRow = TrustedStore & { is_active: boolean }

function parseStoreByDomainRow(value: unknown): StoreByDomainRow | null {
  if (typeof value !== 'object' || value === null) return null

  const candidate = value as Record<string, unknown>
  const { id, subdomain, custom_domain: customDomain, is_active: isActive } = candidate

  if (typeof id !== 'string' || id.length === 0) return null
  if (typeof isActive !== 'boolean') return null
  if (subdomain !== null && typeof subdomain !== 'string') return null
  if (customDomain !== null && typeof customDomain !== 'string') return null

  return { id, subdomain, custom_domain: customDomain, is_active: isActive }
}

function storeMatchesHost(row: StoreByDomainRow, host: string, rootHost: string): boolean {
  if (row.is_active !== true) return false

  const customDomain = (row.custom_domain ?? '').toLowerCase()
  if (customDomain.length > 0 && host === customDomain) return true

  if (row.subdomain !== null) {
    const subdomain = row.subdomain.toLowerCase()
    if (subdomain.length > 0 && host === `${subdomain}.${rootHost}`) return true
  }

  return false
}

async function lookupStoreByDomain(host: string): Promise<StoreByDomainRow | null> {
  try {
    const client = await createClient()
    const { data, error } = await client
      .rpc('get_store_by_domain', { p_host: host })
      .maybeSingle()

    if (error || !data) return null
    return parseStoreByDomainRow(data)
  } catch {
    return null
  }
}

/**
 * Devuelve un path interno canónico para `next`, o '/' si el valor no es confiable.
 * El segundo pass sobre el valor canónico cierra bypasses donde el parser de URL
 * normaliza `..` a un pathname que empieza con '//'.
 */
export function sanitizeNextPath(raw: string | null | undefined, baseOrigin: string): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_NEXT_LENGTH) return '/'
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/'
  if (raw.includes('\\')) return '/'
  if (CONTROL_CHARS.test(raw)) return '/'
  if (ENCODED_SEPARATORS.test(raw)) return '/'

  try {
    const base = new URL(baseOrigin)
    const resolved = new URL(raw, base)

    if (resolved.origin !== base.origin) return '/'
    if (resolved.username.length > 0 || resolved.password.length > 0) return '/'

    const candidate = resolved.pathname + resolved.search + resolved.hash
    if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.startsWith('/\\')) return '/'
    if (candidate.includes('\\')) return '/'

    return candidate
  } catch {
    return '/'
  }
}

/**
 * Resuelve un `from_origin` a un origin confiable. Nunca devuelve el string crudo.
 * Falla cerrado: solo config raíz, subdominios del root, o dominio verificado en BD.
 */
export async function resolveTrustedSsoOrigin(raw: string | null | undefined): Promise<TrustedOrigin | null> {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null

  let rootUrl: URL
  let parsed: URL
  try {
    rootUrl = new URL(getRootOrigin())
    parsed = new URL(raw)
  } catch {
    return null
  }

  if (parsed.protocol !== rootUrl.protocol) return null
  if (parsed.username.length > 0 || parsed.password.length > 0) return null
  if (parsed.pathname !== '/' || parsed.search.length > 0 || parsed.hash.length > 0) return null

  const host = parsed.host.toLowerCase()
  const rootHost = rootUrl.host.toLowerCase()

  if (host === rootHost) {
    return { origin: parsed.origin, host, store: null }
  }

  if (host.endsWith(`.${rootHost}`)) {
    const row = await lookupStoreByDomain(host)
    const store = row && storeMatchesHost(row, host, rootHost)
      ? { id: row.id, subdomain: row.subdomain, custom_domain: row.custom_domain }
      : null
    return { origin: parsed.origin, host, store }
  }

  const row = await lookupStoreByDomain(host)
  if (!row || !storeMatchesHost(row, host, rootHost)) return null

  return {
    origin: parsed.origin,
    host,
    store: { id: row.id, subdomain: row.subdomain, custom_domain: row.custom_domain },
  }
}
