/** @jest-environment node */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimit } from '@/lib/ratelimit'
import { getRootOrigin, getRootOriginSafe } from '@/lib/config/root-origin'
import { proxy } from '@/proxy'

type NextServerModule = typeof import('next/server')

jest.mock('next/server', () => {
  const actual: NextServerModule = jest.requireActual('next/server')

  class MockNextResponse extends actual.NextResponse {
    static redirect = jest.fn((...args: Parameters<typeof actual.NextResponse.redirect>) =>
      actual.NextResponse.redirect(...args))
    static next = jest.fn((...args: Parameters<typeof actual.NextResponse.next>) =>
      actual.NextResponse.next(...args))
  }

  return { ...actual, NextResponse: MockNextResponse }
})

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))
jest.mock('@/lib/ratelimit', () => ({
  rateLimit: {
    critical: { limit: jest.fn() },
    operational: { limit: jest.fn() },
    public: { limit: jest.fn() },
  },
}))
jest.mock('@/lib/config/root-origin', () => {
  const actual: typeof import('@/lib/config/root-origin') = jest.requireActual('@/lib/config/root-origin')
  return { ...actual, getRootOrigin: jest.fn(), getRootOriginSafe: jest.fn() }
})

const mockedRedirect = jest.mocked(NextResponse.redirect)
const mockedCreateServerClient = jest.mocked(createServerClient)
const mockedGetRootOrigin = jest.mocked(getRootOrigin)
const mockedGetRootOriginSafe = jest.mocked(getRootOriginSafe)

const ROOT = 'https://plataforma.example.test'
const ROOT_HOST = new URL(ROOT).host

let rpc: jest.Mock
let getUser: jest.Mock
let logSpy: jest.SpyInstance
let warnSpy: jest.SpyInstance
let errorSpy: jest.SpyInstance

function makeRequest(url: string, host: string, extraHeaders: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, { headers: { host, ...extraHeaders } })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetRootOrigin.mockReturnValue(ROOT)
  mockedGetRootOriginSafe.mockReturnValue(ROOT)

  rpc = jest.fn().mockReturnValue({
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  })
  getUser = jest.fn().mockResolvedValue({ data: { user: null }, error: null })
  mockedCreateServerClient.mockReturnValue({
    rpc,
    auth: { getUser },
  } as unknown as ReturnType<typeof createServerClient>)

  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  logSpy.mockRestore()
  warnSpy.mockRestore()
  errorSpy.mockRestore()
})

describe('proxy con origen raíz centralizado', () => {
  it('usa el host configurado (sin literales) para desviar el code del root al callback', async () => {
    const response = await proxy(makeRequest(`${ROOT}/?code=abc123&state=xyz`, ROOT_HOST))
    const location = response.headers.get('location') ?? ''
    const callback = new URL(location)

    expect(response.status).toBe(307)
    expect(callback.origin).toBe(new URL(ROOT).origin)
    expect(callback.pathname).toBe('/api/auth/callback')
    expect(callback.searchParams.get('code')).toBe('abc123')
    expect(callback.searchParams.get('state')).toBe('xyz')
    expect(mockedRedirect).toHaveBeenCalledTimes(1)
  })

  it('bloquea /pos en el host raíz y redirige al root configurado', async () => {
    const response = await proxy(makeRequest(`${ROOT}/pos`, ROOT_HOST))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${ROOT}/`)
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'")
    expect(getUser).not.toHaveBeenCalled()
  })

  it('no confía en x-forwarded-proto del cliente: usa el protocolo del root', async () => {
    const response = await proxy(makeRequest(`${ROOT}/pos`, ROOT_HOST, { 'x-forwarded-proto': 'http' }))

    expect(response.headers.get('location')).toBe(`${ROOT}/`)
  })

  it('inyecta el protocolo canónico en los headers propagados a la ruta', async () => {
    const tenantHost = 'tienda.example.test'
    rpc.mockReturnValue({
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'store-1', tier: 'pro', slug: 'tienda', name: 'Tienda' },
        error: null,
      }),
    })

    await proxy(makeRequest(`https://${tenantHost}/`, tenantHost, { 'x-forwarded-proto': 'http' }))

    const init = jest.mocked(NextResponse.next).mock.calls[0][0] as
      | { request?: { headers: Headers } }
      | undefined
    expect(init?.request?.headers.get('x-forwarded-proto')).toBe('https')
  })

  it('redirige host desconocido al root configurado', async () => {
    const unknownHost = 'tienda.desconocida.test'
    const response = await proxy(makeRequest(`https://${unknownHost}/pos`, unknownHost))

    expect(rpc).toHaveBeenCalledWith('get_store_by_domain', { p_host: unknownHost })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(`${ROOT}/`)
    expect(rateLimit.critical.limit).not.toHaveBeenCalled()
  })

  it('config inválida → 500 con CSP y sin redirect', async () => {
    mockedGetRootOriginSafe.mockReturnValue(null)

    const response = await proxy(makeRequest(`${ROOT}/pos`, ROOT_HOST))

    expect(response.status).toBe(500)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'")
    expect(mockedRedirect).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
    expect(mockedGetRootOrigin).not.toHaveBeenCalled()
  })
})
