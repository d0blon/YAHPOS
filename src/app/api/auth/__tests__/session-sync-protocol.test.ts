/** @jest-environment node */

import { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getRootOrigin } from '@/lib/config/root-origin'
import { GET } from '@/app/api/auth/session-sync/route'

jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }))
jest.mock('@/lib/supabase', () => ({ createClient: jest.fn() }))
jest.mock('@/lib/config/root-origin', () => ({
  getRootOrigin: jest.fn(),
  getRootOriginSafe: jest.fn(),
}))

const mockedCreateServerClient = jest.mocked(createServerClient)
const mockedGetRootOrigin = jest.mocked(getRootOrigin)

const ROOT = 'https://root.example.test'
const TENANT_HOST = 'tienda.example.test'
const SYNC_URL = `https://${TENANT_HOST}/api/auth/session-sync?access_token=A&refresh_token=R`

type CookieToSet = { name: string; value: string; options: CookieOptions }
type ClientOptions = {
  cookies: { getAll(): unknown[]; setAll(cookies: CookieToSet[]): void }
  cookieOptions?: { secure?: boolean }
}

let cookieOptions: ClientOptions['cookieOptions']
let logSpy: jest.SpyInstance
let errorSpy: jest.SpyInstance

function makeRequest(extraHeaders: Record<string, string> = {}): NextRequest {
  return new NextRequest(SYNC_URL, { headers: { host: TENANT_HOST, ...extraHeaders } })
}

function expectCookieSecure(response: Response, secure: boolean): void {
  const setCookie = response.headers.get('set-cookie') ?? ''
  if (secure) {
    expect(setCookie).toMatch(/;\s*Secure\b/i)
  } else {
    expect(setCookie).not.toMatch(/;\s*Secure\b/i)
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetRootOrigin.mockReturnValue(ROOT)
  cookieOptions = undefined

  mockedCreateServerClient.mockImplementation((...args) => {
    const options = args[2] as unknown as ClientOptions
    cookieOptions = options.cookieOptions
    return {
      auth: {
        setSession: jest.fn(async () => {
          options.cookies.setAll([{ name: 'sb-access-token', value: 'TOKEN', options: {} }])
          return { data: { session: { access_token: 'TOKEN' } }, error: null }
        }),
      },
    } as unknown as ReturnType<typeof createServerClient>
  })

  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  logSpy.mockRestore()
  errorSpy.mockRestore()
})

describe('session-sync protocolo y cookies', () => {
  it('x-forwarded-proto: http → cookie sin Secure', async () => {
    const response = await GET(makeRequest({ 'x-forwarded-proto': 'http' }))

    expect(response.status).toBe(200)
    expect(cookieOptions?.secure).toBe(false)
    expectCookieSecure(response, false)
    expect(await response.text()).toContain(`window.location.replace("http://${TENANT_HOST}/admin")`)
  })

  it('x-forwarded-proto: https → cookie Secure', async () => {
    const response = await GET(makeRequest({ 'x-forwarded-proto': 'https' }))

    expect(cookieOptions?.secure).toBe(true)
    expectCookieSecure(response, true)
    expect(await response.text()).toContain(`window.location.replace("https://${TENANT_HOST}/admin")`)
  })

  it('sin header usa el protocolo del origin raíz http', async () => {
    mockedGetRootOrigin.mockReturnValue('http://root.example.test:3000')
    const response = await GET(makeRequest())

    expect(cookieOptions?.secure).toBe(false)
    expectCookieSecure(response, false)
    expect(await response.text()).toContain(`window.location.replace("http://${TENANT_HOST}/admin")`)
  })

  it('sin header usa el protocolo del origin raíz https', async () => {
    const response = await GET(makeRequest())

    expect(cookieOptions?.secure).toBe(true)
    expectCookieSecure(response, true)
  })

  it('config rota → fail-closed a https y cookie Secure', async () => {
    mockedGetRootOrigin.mockImplementation(() => { throw new Error('config') })
    const response = await GET(makeRequest())

    expect(cookieOptions?.secure).toBe(true)
    expectCookieSecure(response, true)
  })

  it('next=//evil sigue sanitizado con cualquier protocolo', async () => {
    const request = new NextRequest(
      `${SYNC_URL}&next=${encodeURIComponent('//evil.example.net')}`,
      { headers: { host: TENANT_HOST, 'x-forwarded-proto': 'http' } }
    )
    const response = await GET(request)
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).not.toContain('evil.example.net')
    expect(body).toContain(`window.location.replace("http://${TENANT_HOST}/")`)
    expect(cookieOptions?.secure).toBe(false)
  })
})
