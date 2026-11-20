/** @jest-environment node */

import { getRootOrigin } from '@/lib/config/root-origin'
import { createClient } from '@/lib/supabase'
import {
  isRootRequestHost,
  resolveTrustedSsoOrigin,
  sanitizeNextPath,
} from '@/lib/auth/sso-target'

jest.mock('@/lib/config/root-origin', () => ({ getRootOrigin: jest.fn() }))
jest.mock('@/lib/supabase', () => ({ createClient: jest.fn() }))

const mockedGetRootOrigin = jest.mocked(getRootOrigin)
const mockedCreateClient = jest.mocked(createClient)

const ROOT = 'https://root.example.test'
const ROOT_HOST = 'root.example.test'
const SUB_HOST = `tienda.${ROOT_HOST}`
const CUSTOM_HOST = 'tienda-custom.example.net'
const EVIL_HOST = 'evil.example.net'

type RpcResult = { data: unknown; error: { message: string } | null }

type StoreRow = {
  id: string
  name: string
  slug: string
  tier: string
  subdomain: string | null
  custom_domain: string | null
  is_active: boolean
  config: unknown
}

function storeRow(overrides: Partial<StoreRow> = {}): StoreRow {
  return {
    id: 'store-1',
    name: 'Tienda',
    slug: 'tienda',
    tier: 'pro',
    subdomain: 'tienda',
    custom_domain: null,
    is_active: true,
    config: {},
    ...overrides,
  }
}

function mockRpc(result: RpcResult) {
  const maybeSingle = jest.fn().mockResolvedValue(result)
  const rpc = jest.fn().mockReturnValue({ maybeSingle })
  mockedCreateClient.mockResolvedValue({ rpc } as unknown as Awaited<ReturnType<typeof createClient>>)
  return rpc
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetRootOrigin.mockReturnValue(ROOT)
})

describe('sanitizeNextPath', () => {
  it.each([
    null,
    undefined,
    '',
    'x'.repeat(2049),
    'admin',
    '//evil.example.net',
    '/\\evil.example.net',
    '/admin\\also',
    '/admin\u0000',
    '/admin\u001f',
    '/admin\u007f',
    '/%5cevil.example.net',
    '/%2F%2Fevil.example.net',
    'https://evil.example.net',
  ])('devuelve "/" para next inseguro: %p', (raw) => {
    expect(sanitizeNextPath(raw, ROOT)).toBe('/')
  })

  it('conserva path, query y hash internos canónicos', () => {
    expect(sanitizeNextPath('/admin?tab=inventario#seccion', ROOT)).toBe('/admin?tab=inventario#seccion')
  })

  it('normaliza segmentos ".." internos', () => {
    expect(sanitizeNextPath('/admin/../pos', ROOT)).toBe('/pos')
  })

  it('rechaza la normalización de URL a un pathname "//host"', () => {
    expect(sanitizeNextPath('/..//evil.example.net', ROOT)).toBe('/')
    expect(sanitizeNextPath('/%2e%2e//evil.example.net', ROOT)).toBe('/')
  })

  it('falla cerrado si baseOrigin es inválido', () => {
    expect(sanitizeNextPath('/admin', 'not-a-url')).toBe('/')
  })
})

describe('resolveTrustedSsoOrigin', () => {
  it('devuelve null sin consultar RPC si raw está vacío', async () => {
    await expect(resolveTrustedSsoOrigin('')).resolves.toBeNull()
    await expect(resolveTrustedSsoOrigin('   ')).resolves.toBeNull()
    await expect(resolveTrustedSsoOrigin(null)).resolves.toBeNull()
    expect(mockedCreateClient).not.toHaveBeenCalled()
  })

  it('acepta el origin raíz exacto sin RPC', async () => {
    await expect(resolveTrustedSsoOrigin(ROOT)).resolves.toEqual({
      origin: ROOT,
      host: ROOT_HOST,
      store: null,
    })
    expect(mockedCreateClient).not.toHaveBeenCalled()
  })

  it('acepta un subdominio del root y enriquece la tienda si la RPC la devuelve', async () => {
    const rpc = mockRpc({ data: storeRow(), error: null })

    const result = await resolveTrustedSsoOrigin(`https://${SUB_HOST}`)

    expect(result).toEqual({
      origin: `https://${SUB_HOST}`,
      host: SUB_HOST,
      store: { id: 'store-1', subdomain: 'tienda', custom_domain: null },
    })
    expect(rpc).toHaveBeenCalledWith('get_store_by_domain', { p_host: SUB_HOST })
  })

  it('acepta un subdominio del root aunque la RPC no devuelva tienda', async () => {
    mockRpc({ data: null, error: null })

    const result = await resolveTrustedSsoOrigin(`https://${SUB_HOST}`)

    expect(result).toEqual({ origin: `https://${SUB_HOST}`, host: SUB_HOST, store: null })
  })

  it('acepta un custom domain activo validado por RPC y devuelve el origin canónico', async () => {
    const rpc = mockRpc({ data: storeRow({ custom_domain: CUSTOM_HOST, subdomain: null }), error: null })

    const result = await resolveTrustedSsoOrigin(`https://${CUSTOM_HOST.toUpperCase()}/`)

    expect(result).toEqual({
      origin: `https://${CUSTOM_HOST}`,
      host: CUSTOM_HOST,
      store: { id: 'store-1', subdomain: null, custom_domain: CUSTOM_HOST },
    })
    expect(rpc).toHaveBeenCalledWith('get_store_by_domain', { p_host: CUSTOM_HOST })
  })

  it('falla cerrado si la RPC no conoce el host', async () => {
    mockRpc({ data: null, error: null })
    await expect(resolveTrustedSsoOrigin(`https://${EVIL_HOST}`)).resolves.toBeNull()
  })

  it('falla cerrado si la RPC falla', async () => {
    mockRpc({ data: null, error: { message: 'rpc down' } })
    await expect(resolveTrustedSsoOrigin(`https://${CUSTOM_HOST}`)).resolves.toBeNull()
  })

  it('falla cerrado si la tienda está inactiva', async () => {
    mockRpc({ data: storeRow({ custom_domain: CUSTOM_HOST, is_active: false }), error: null })
    await expect(resolveTrustedSsoOrigin(`https://${CUSTOM_HOST}`)).resolves.toBeNull()
  })

  it('falla cerrado si el host no coincide con custom_domain ni subdomain', async () => {
    mockRpc({ data: storeRow({ custom_domain: 'otro.example.net', subdomain: 'otra' }), error: null })
    await expect(resolveTrustedSsoOrigin(`https://${CUSTOM_HOST}`)).resolves.toBeNull()
  })

  it.each([
    `https://user:pass@${ROOT_HOST}`,
    `https://${ROOT_HOST}/ruta`,
    `https://${ROOT_HOST}?x=1`,
    `https://${ROOT_HOST}#frag`,
    `http://${ROOT_HOST}`,
    'not-a-url',
  ])('falla cerrado para origin inválido: %s', async (raw) => {
    await expect(resolveTrustedSsoOrigin(raw)).resolves.toBeNull()
    expect(mockedCreateClient).not.toHaveBeenCalled()
  })

  it('falla cerrado si getRootOrigin falla', async () => {
    mockedGetRootOrigin.mockImplementation(() => { throw new Error('config') })
    await expect(resolveTrustedSsoOrigin(ROOT)).resolves.toBeNull()
  })
})

describe('isRootRequestHost', () => {
  it.each([
    ROOT_HOST,
    ROOT_HOST.toUpperCase(),
    `www.${ROOT_HOST}`,
    `WWW.${ROOT_HOST.toUpperCase()}`,
  ])('reconoce el host raíz: %s', (host) => {
    expect(isRootRequestHost(host)).toBe(true)
  })

  it.each([EVIL_HOST, `foo.${ROOT_HOST}`, ''])('rechaza otro host: %s', (host) => {
    expect(isRootRequestHost(host)).toBe(false)
  })

  it('falla cerrado si getRootOrigin falla', () => {
    mockedGetRootOrigin.mockImplementation(() => { throw new Error('config') })
    expect(isRootRequestHost(ROOT_HOST)).toBe(false)
  })
})
