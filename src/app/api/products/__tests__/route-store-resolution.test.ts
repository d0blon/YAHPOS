/** @jest-environment node */

import { GET } from '../route'
import { createAdminClient, createClient } from '@/lib/supabase'
import { parseQuery } from '@/lib/validations/http'

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: jest.fn(async () => body),
    })),
  },
}))

jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/validations/http', () => ({
  parseQuery: jest.fn(),
  parseBody: jest.fn(),
}))

const mockedCreateClient = jest.mocked(createClient)
const mockedCreateAdminClient = jest.mocked(createAdminClient)
const parseQueryMock = jest.mocked(parseQuery)

const DEV_HOST = 'tienda.localhost:3000'
const DEV_SUBDOMAIN = DEV_HOST.slice(0, DEV_HOST.indexOf('.'))
const DEMO_HOST = DEV_HOST.replace(DEV_SUBDOMAIN, 'master')
const UNKNOWN_HOST = DEV_HOST.replace(DEV_SUBDOMAIN, 'desconocida')
const STORE_ID = 'store-1'

type RpcResult = { data: unknown; error: { message: string } | null }

interface QueryBuilder {
  select: jest.Mock
  eq: jest.Mock
  in: jest.Mock
  order: jest.Mock
  limit: jest.Mock
  maybeSingle: jest.Mock
  then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>
}

const PRODUCT_ROW = {
  id: '77',
  name: 'Producto de prueba',
  slug: 'producto-de-prueba',
  description: 'Descripción',
  price: 1234,
  image: '',
  category: 'alimentos',
  stock: 9,
  low_stock_threshold: 2,
  sku: 'SKU-1',
  barcode: 'SKU-1',
  brand: 'Marca',
  volume: '',
  supplier_name: '',
  supplier_metadata: {},
  unit: 'un',
  is_exempt: false,
  nutritional_seals: 0,
  is_realtime_tracked: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  inventory: [],
}

function makeQuery(result: unknown): QueryBuilder {
  const builder = {} as QueryBuilder
  builder.select = jest.fn(() => builder)
  builder.eq = jest.fn(() => builder)
  builder.in = jest.fn(() => builder)
  builder.order = jest.fn(() => builder)
  builder.limit = jest.fn(() => builder)
  builder.maybeSingle = jest.fn().mockResolvedValue(result)
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  return builder
}

interface SetupOptions {
  rpcResult?: RpcResult
  user?: { id: string } | null
  productResult?: unknown
}

function setup(options: SetupOptions = {}) {
  const rpcResult: RpcResult = options.rpcResult ?? { data: { id: STORE_ID }, error: null }
  const products = makeQuery(options.productResult ?? { data: [PRODUCT_ROW], error: null })
  const maybeSingle = jest.fn().mockResolvedValue(rpcResult)
  const rpc = jest.fn(() => ({ maybeSingle }))
  const from = jest.fn((table: string) => {
    if (table !== 'products') throw new Error(`Tabla inesperada: ${table}`)
    return products
  })

  mockedCreateAdminClient.mockReturnValue(
    { rpc, from } as unknown as ReturnType<typeof createAdminClient>
  )

  const user = options.user === undefined ? null : options.user
  mockedCreateClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }) },
  } as unknown as Awaited<ReturnType<typeof createClient>>)

  parseQueryMock.mockReturnValue({
    data: { slug: undefined, category: undefined, search: undefined, branch_id: undefined },
  })

  return { rpc, from, products }
}

function request(host: string): Request {
  return new Request(`http://${host}/api/products`, { headers: { host } })
}

async function jsonBody(response: Response): Promise<unknown> {
  const body: unknown = await response.json()
  return body
}

function productList(body: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(body)) throw new Error('Respuesta no es un array')
  return body as Array<Record<string, unknown>>
}

describe('GET /api/products — resolución de tienda por RPC', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('pasa el host dev completo a la RPC y consulta products con store_id resuelto', async () => {
    const { rpc, from, products } = setup()

    const response = await GET(request(DEV_HOST))
    const body = productList(await jsonBody(response))

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('get_store_by_domain', { p_host: DEV_HOST })
    expect(from).not.toHaveBeenCalledWith('stores')
    expect(products.eq).toHaveBeenCalledWith('store_id', STORE_ID)
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe(PRODUCT_ROW.id)
  })

  it('falla cerrado con 404 si la RPC no resuelve el host', async () => {
    const { from } = setup({ rpcResult: { data: null, error: null } })

    const response = await GET(request(UNKNOWN_HOST))

    expect(response.status).toBe(404)
    expect(await jsonBody(response)).toEqual({ error: 'Tienda no encontrada' })
    expect(from).not.toHaveBeenCalled()
  })

  it('falla cerrado si la RPC devuelve un id que no es string no vacío', async () => {
    const { from } = setup({ rpcResult: { data: { id: 42 }, error: null } })

    const response = await GET(request(DEV_HOST))

    expect(response.status).toBe(404)
    expect(from).not.toHaveBeenCalled()
  })

  it('falla cerrado si la RPC devuelve error', async () => {
    const { from } = setup({
      rpcResult: { data: { id: STORE_ID }, error: { message: 'rpc down' } },
    })

    const response = await GET(request(DEV_HOST))

    expect(response.status).toBe(404)
    expect(from).not.toHaveBeenCalled()
  })

  it('sirve catálogo demo en host demo sin sesión, sin crear cliente admin', async () => {
    setup()

    const response = await GET(request(DEMO_HOST))
    const body = productList(await jsonBody(response))

    expect(response.status).toBe(200)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0].id).toContain('demo-')
    expect(mockedCreateAdminClient).not.toHaveBeenCalled()
  })

  it('usa la RPC con el host demo cuando hay sesión activa', async () => {
    const { rpc, from, products } = setup({ user: { id: 'user-1' } })

    const response = await GET(request(DEMO_HOST))
    const body = productList(await jsonBody(response))

    expect(response.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('get_store_by_domain', { p_host: DEMO_HOST })
    expect(from).toHaveBeenCalledWith('products')
    expect(products.eq).toHaveBeenCalledWith('store_id', STORE_ID)
    expect(body[0].id).toBe(PRODUCT_ROW.id)
  })
})
