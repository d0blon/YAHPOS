/** @jest-environment node */

import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase'
import { getRootOrigin } from '@/lib/config/root-origin'
import { GET as ssoGet } from '@/app/api/auth/sso/route'
import { GET as callbackGet } from '@/app/api/auth/callback/route'
import { GET as syncGet } from '@/app/api/auth/session-sync/route'

jest.mock('@/lib/config/root-origin', () => ({ getRootOrigin: jest.fn() }))
jest.mock('@/lib/supabase', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/constants', () => ({ DEVELOPER_EMAILS: [] }))
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))

const mockedGetRootOrigin = jest.mocked(getRootOrigin)
const mockedCreateClient = jest.mocked(createClient)
const mockedCreateServerClient = jest.mocked(createServerClient)

const ROOT = 'https://root.example.test'
const ROOT_HOST = 'root.example.test'
const CUSTOM_HOST = 'tienda-custom.example.net'
const EVIL_HOST = 'evil.example.net'
const SESSION = { access_token: 'ACCESS_VALUE', refresh_token: 'REFRESH_VALUE' }

const signInWithOAuth = jest.fn()
const setSession = jest.fn()

type QueryBuilder = {
  select: jest.Mock
  eq: jest.Mock
  not: jest.Mock
  limit: jest.Mock
  single: jest.Mock
  maybeSingle: jest.Mock
  then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>
}

function query(result: unknown, singleResult: unknown = result): QueryBuilder {
  const builder: QueryBuilder = {
    select: jest.fn(),
    eq: jest.fn(),
    not: jest.fn(),
    limit: jest.fn(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.not.mockReturnValue(builder)
  builder.limit.mockReturnValue(builder)
  builder.single.mockResolvedValue({ data: singleResult, error: null })
  builder.maybeSingle.mockResolvedValue({ data: singleResult, error: null })
  return builder
}

function makeRequest(url: string, host = ROOT_HOST): NextRequest {
  return new NextRequest(url, { headers: { host } })
}

function callbackUrl(redirectTo: string): URL {
  expect(typeof redirectTo).toBe('string')
  return new URL(redirectTo)
}

type AnonOptions = {
  storeByDomain?: unknown
  rpcError?: { message: string } | null
  exchangeError?: { message: string }
  exchangeThrows?: boolean
  profile?: unknown
  session?: unknown
  userStores?: unknown
  membership?: unknown
  store?: unknown
}

function mockAnonClient(options: AnonOptions = {}) {
  const user = { id: 'user-1', email: 'ana@example.test', user_metadata: {} }
  const profile = options.profile ?? { id: 'user-1', role: 'admin', first_name: 'Ana', store_id: null }
  const tables: Record<string, QueryBuilder> = {
    profiles: query({ data: profile, error: null }, profile),
    user_stores: query({ data: options.userStores ?? [], error: null }, options.membership ?? null),
    stores: query({ data: options.store ?? null, error: null }, options.store ?? null),
  }
  const exchangeCodeForSession = jest.fn(async () => {
    if (options.exchangeThrows) throw new Error('boom')
    return { data: { user }, error: options.exchangeError ?? null }
  })
  const getSession = jest.fn().mockResolvedValue({
    data: { session: options.session === undefined ? SESSION : options.session },
  })
  const from = jest.fn((table: string) => tables[table] ?? query({ data: null, error: null }))
  const maybeSingle = jest.fn().mockResolvedValue({
    data: options.storeByDomain ?? null,
    error: options.rpcError ?? null,
  })
  const rpc = jest.fn().mockReturnValue({ maybeSingle })
  const client = { auth: { exchangeCodeForSession, getSession }, from, rpc }
  mockedCreateClient.mockResolvedValue(client as unknown as Awaited<ReturnType<typeof createClient>>)
  return { exchangeCodeForSession, getSession, from, tables, rpc }
}

function storeByDomain(customDomain: string, subdomain: string | null = null, id = 'store-1') {
  return { id, name: 'Tienda', slug: 'tienda', tier: 'pro', subdomain, custom_domain: customDomain, is_active: true }
}

let logSpy: jest.SpyInstance
let errorSpy: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  mockedGetRootOrigin.mockReturnValue(ROOT)
  signInWithOAuth.mockResolvedValue({ data: { url: 'https://oauth.example.test/authorize' }, error: null })
  setSession.mockResolvedValue({ data: { session: SESSION }, error: null })
  mockedCreateServerClient.mockReturnValue({
    auth: { signInWithOAuth, setSession },
  } as unknown as ReturnType<typeof createServerClient>)
})

afterEach(() => {
  logSpy.mockRestore()
  errorSpy.mockRestore()
})

describe('GET /api/auth/sso', () => {
  it('rechaza from_origin ajeno antes de iniciar OAuth', async () => {
    mockAnonClient()
    const request = makeRequest(
      `${ROOT}/api/auth/sso?from_origin=${encodeURIComponent(`https://${EVIL_HOST}`)}`
    )

    const response = await ssoGet(request)
    const location = response.headers.get('location') ?? ''

    expect(response.status).toBe(307)
    expect(location).toBe(`${ROOT}/login?error=invalid_origin`)
    expect(location).not.toContain(EVIL_HOST)
    expect(signInWithOAuth).not.toHaveBeenCalled()
  })

  it('sanitiza next con slash invertido y normalización "//host"', async () => {
    const first = await ssoGet(makeRequest(
      `${ROOT}/api/auth/sso?next=${encodeURIComponent('/\\evil.example.net')}`
    ))
    const second = await ssoGet(makeRequest(
      `${ROOT}/api/auth/sso?next=${encodeURIComponent('/..//evil.example.net')}`
    ))

    for (const response of [first, second]) {
      const redirectTo = signInWithOAuth.mock.calls.at(-1)?.[0]?.options?.redirectTo as string
      const parsed = callbackUrl(redirectTo)
      expect(parsed.origin).toBe(ROOT)
      expect(parsed.searchParams.get('next')).toBe('/')
      expect(parsed.searchParams.has('from_origin')).toBe(false)
      expect(redirectTo).not.toContain(EVIL_HOST)
      expect(response.status).toBe(307)
    }
  })

  it('propaga un custom domain válido y un next con query/hash', async () => {
    mockAnonClient({ storeByDomain: storeByDomain(CUSTOM_HOST) })
    const rawNext = '/admin?tab=inventario#seccion'
    await ssoGet(makeRequest(
      `${ROOT}/api/auth/sso?from_origin=${encodeURIComponent(`https://${CUSTOM_HOST}`)}&next=${encodeURIComponent(rawNext)}`
    ))

    const redirectTo = signInWithOAuth.mock.calls[0]?.[0]?.options?.redirectTo as string
    const parsed = callbackUrl(redirectTo)
    expect(parsed.searchParams.get('from_origin')).toBe(`https://${CUSTOM_HOST}`)
    expect(parsed.searchParams.get('next')).toBe(rawNext)
    expect(signInWithOAuth.mock.calls[0]?.[0]?.options?.queryParams).toEqual({
      prompt: 'select_account',
      access_type: 'offline',
    })
  })

  it('no agrega from_origin cuando no viene en la request', async () => {
    await ssoGet(makeRequest(`${ROOT}/api/auth/sso`))
    const redirectTo = signInWithOAuth.mock.calls[0]?.[0]?.options?.redirectTo as string
    const parsed = callbackUrl(redirectTo)
    expect(parsed.searchParams.has('from_origin')).toBe(false)
    expect(parsed.searchParams.get('next')).toBe('/admin')
  })

  it('errores de OAuth redirigen al origin confiable, nunca al raw', async () => {
    mockAnonClient({ storeByDomain: storeByDomain(CUSTOM_HOST) })
    signInWithOAuth.mockResolvedValue({ data: { url: '' }, error: { message: 'oauth down' } })

    const response = await ssoGet(makeRequest(
      `${ROOT}/api/auth/sso?from_origin=${encodeURIComponent(`https://${CUSTOM_HOST}`)}`
    ))

    expect(response.headers.get('location')).toBe(`https://${CUSTOM_HOST}/login?error=sso_failed`)
  })
})

describe('GET /api/auth/callback', () => {
  const withCode = (params: string) => `${ROOT}/api/auth/callback?code=abc123&${params}`

  it('rechaza from_origin ajeno ANTES del exchange, con y sin code', async () => {
    const { exchangeCodeForSession } = mockAnonClient()
    const evilOrigin = encodeURIComponent(`https://${EVIL_HOST}`)
    const responses = [
      await callbackGet(makeRequest(withCode(`from_origin=${evilOrigin}`))),
      await callbackGet(makeRequest(`${ROOT}/api/auth/callback?from_origin=${evilOrigin}`)),
    ]

    for (const response of responses) {
      const location = response.headers.get('location') ?? ''
      expect(response.status).toBe(307)
      expect(location).toBe(`${ROOT}/login?error=invalid_origin`)
      expect(location).not.toContain(EVIL_HOST)
    }
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('envía tokens solo al custom domain confiable vía session-sync', async () => {
    const { exchangeCodeForSession } = mockAnonClient({ storeByDomain: storeByDomain(CUSTOM_HOST) })
    const rawNext = '/pos?caja=1#total'
    const response = await callbackGet(makeRequest(withCode(
      `from_origin=${encodeURIComponent(`https://${CUSTOM_HOST}`)}&next=${encodeURIComponent(rawNext)}`
    )))

    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123')
    const location = response.headers.get('location') ?? ''
    const parsed = new URL(location)
    expect(parsed.origin).toBe(`https://${CUSTOM_HOST}`)
    expect(parsed.pathname).toBe('/api/auth/session-sync')
    expect(parsed.searchParams.get('access_token')).toBe(SESSION.access_token)
    expect(parsed.searchParams.get('refresh_token')).toBe(SESSION.refresh_token)
    expect(parsed.searchParams.get('next')).toBe(rawNext)
    expect(location).not.toContain(EVIL_HOST)
  })

  it('busca membresía por store_id cuando la RPC resolvió la tienda', async () => {
    const { tables } = mockAnonClient({
      storeByDomain: storeByDomain(CUSTOM_HOST, 'tienda', 'store-42'),
      membership: { store_id: 'store-42' },
    })

    await callbackGet(makeRequest(withCode(`from_origin=${encodeURIComponent(`https://${CUSTOM_HOST}`)}`)))

    const eqCalls = tables.user_stores.eq.mock.calls as unknown as Array<[string, unknown]>
    expect(eqCalls).toContainEqual(['store_id', 'store-42'])
    expect(eqCalls.some(([column]) => column === 'stores.subdomain')).toBe(false)
  })

  it('usa el rootHost configurado para la primera tienda (sin dominios literales)', async () => {
    const alternateRoot = 'https://plataforma.test'
    mockedGetRootOrigin.mockReturnValue(alternateRoot)
    mockAnonClient({
      userStores: [{ store_id: 'store-1', stores: { subdomain: 'tienda', custom_domain: null } }],
    })

    const response = await callbackGet(makeRequest(
      `${alternateRoot}/api/auth/callback?code=abc123`,
      'plataforma.test'
    ))
    const parsed = new URL(response.headers.get('location') ?? '')

    expect(parsed.origin).toBe('https://tienda.plataforma.test')
    expect(parsed.pathname).toBe('/api/auth/session-sync')
    expect(parsed.searchParams.get('next')).toBe('/admin')
  })

  it('no filtra tokens a next hostil cuando no hay from_origin', async () => {
    mockAnonClient({
      userStores: [{ store_id: 'store-1', stores: { subdomain: 'tienda', custom_domain: null } }],
    })

    const response = await callbackGet(makeRequest(withCode(
      `next=${encodeURIComponent('/\\evil.example.net')}`
    )))
    const location = response.headers.get('location') ?? ''
    const parsed = new URL(location)

    expect(parsed.origin).toBe('https://tienda.root.example.test')
    expect(parsed.searchParams.get('next')).toBe('/')
    expect(location).not.toContain(EVIL_HOST)
  })

  it('errores de exchange usan targetOrigin confiable', async () => {
    mockAnonClient({ storeByDomain: storeByDomain(CUSTOM_HOST), exchangeError: { message: 'bad code' } })

    const withTrusted = await callbackGet(makeRequest(withCode(
      `from_origin=${encodeURIComponent(`https://${CUSTOM_HOST}`)}`
    )))
    expect(withTrusted.headers.get('location')).toBe(`https://${CUSTOM_HOST}/login?error=auth_failed`)

    mockAnonClient({ exchangeError: { message: 'bad code' } })
    const withoutOrigin = await callbackGet(makeRequest(withCode('')))
    expect(withoutOrigin.headers.get('location')).toBe(`${ROOT}/login?error=auth_failed`)
  })

  it('errores inesperados y excepciones usan targetOrigin', async () => {
    mockAnonClient({ exchangeThrows: true })
    const response = await callbackGet(makeRequest(withCode('')))
    expect(response.headers.get('location')).toBe(`${ROOT}/login?error=unexpected`)
  })

  it('ya en subdominio, navega internamente con next sanitizado', async () => {
    const subOrigin = 'https://tienda.root.example.test'
    const response = await callbackGet(makeRequest(
      `${subOrigin}/api/auth/callback?next=${encodeURIComponent('//evil.example.net')}`,
      'tienda.root.example.test'
    ))
    expect(response.headers.get('location')).toBe('https://tienda.root.example.test/')
  })

  it('sin code pero con from_origin confiable pasa por session-sync', async () => {
    const { getSession } = mockAnonClient({ storeByDomain: storeByDomain(CUSTOM_HOST) })

    const response = await callbackGet(makeRequest(
      `${ROOT}/api/auth/callback?from_origin=${encodeURIComponent(`https://${CUSTOM_HOST}`)}`
    ))
    const parsed = new URL(response.headers.get('location') ?? '')

    expect(getSession).toHaveBeenCalled()
    expect(parsed.origin).toBe(`https://${CUSTOM_HOST}`)
    expect(parsed.pathname).toBe('/api/auth/session-sync')
  })
})

describe('GET /api/auth/session-sync', () => {
  const syncUrl = (next: string) =>
    `https://tienda.root.example.test/api/auth/session-sync` +
    `?access_token=${SESSION.access_token}&refresh_token=${SESSION.refresh_token}&next=${encodeURIComponent(next)}`

  it('next="//evil.tld" produce un redirect interno sin el host ajeno', async () => {
    const response = await syncGet(makeRequest(syncUrl('//evil.tld'), 'tienda.root.example.test'))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).not.toContain('evil.tld')
    expect(body).toContain('window.location.replace("https://tienda.root.example.test/")')
    expect(setSession).toHaveBeenCalledWith(SESSION)
  })

  it('next="/\\evil.tld" produce un redirect interno sin el host ajeno', async () => {
    const response = await syncGet(makeRequest(syncUrl('/\\evil.tld'), 'tienda.root.example.test'))
    const body = await response.text()

    expect(body).not.toContain('evil.tld')
    expect(body).toContain('window.location.replace("https://tienda.root.example.test/")')
  })

  it('next con separadores codificados también cae en "/"', async () => {
    const response = await syncGet(makeRequest(syncUrl('/%2F%2Fevil.tld'), 'tienda.root.example.test'))
    const body = await response.text()

    expect(body).not.toContain('evil.tld')
    expect(body).toContain('window.location.replace("https://tienda.root.example.test/")')
  })

  it('conserva query y hash de un next interno válido', async () => {
    const response = await syncGet(makeRequest(syncUrl('/admin?tab=1#x'), 'tienda.root.example.test'))
    const body = await response.text()

    expect(body).toContain('window.location.replace("https://tienda.root.example.test/admin?tab=1#x")')
  })

  it('falla cerrado si faltan tokens', async () => {
    const response = await syncGet(makeRequest(
      'https://tienda.root.example.test/api/auth/session-sync?next=%2F%2Fevil.tld',
      'tienda.root.example.test'
    ))

    expect(response.headers.get('location')).toBe(
      'https://tienda.root.example.test/login?error=sync_missing_tokens'
    )
    expect(setSession).not.toHaveBeenCalled()
  })

  it('falla cerrado si setSession falla', async () => {
    setSession.mockResolvedValue({ data: { session: null }, error: { message: 'expired' } })
    const response = await syncGet(makeRequest(syncUrl('/admin'), 'tienda.root.example.test'))

    expect(response.headers.get('location')).toBe(
      'https://tienda.root.example.test/login?error=sync_failed'
    )
  })
})
