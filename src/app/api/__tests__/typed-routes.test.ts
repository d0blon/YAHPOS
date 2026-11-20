/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server'
import {
  DELETE as deleteProduct,
  GET as getProduct,
  PATCH as patchProduct,
} from '../products/[id]/route'
import { GET as getSettings, PATCH as patchSettings } from '../settings/route'
import { POST as postInvoice } from '../admin/inventory/adjustments/upload/route'
import { withAuth } from '@/lib/api-utils'
import { createAdminClient, createClient } from '@/lib/supabase'

jest.mock('@/lib/api-utils', () => ({
  ...jest.requireActual<typeof import('@/lib/api-utils')>('@/lib/api-utils'),
  withAuth: jest.fn(),
}))
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
  createAdminClient: jest.fn(),
}))

interface QueryError {
  message: string
}

interface QueryResult {
  data: unknown
  error: QueryError | null
}

interface QueryBuilder {
  select: jest.Mock
  eq: jest.Mock
  update: jest.Mock
  upsert: jest.Mock
  insert: jest.Mock
  delete: jest.Mock
  single: jest.Mock
  then: (
    resolve: (value: QueryResult) => unknown,
    reject?: (reason: unknown) => unknown
  ) => Promise<unknown>
}

type AuthResult = Awaited<ReturnType<typeof withAuth>>
type SettingsClient = Awaited<ReturnType<typeof createClient>>
type AdminClient = ReturnType<typeof createAdminClient>
type RequestBody = Record<string, unknown>

const USER_ID = 'user-1'
const STORE_ID = 'store-1'
const PRODUCT_ID = 'prod-1'

function buildQuery(result: QueryResult, singleResult: QueryResult = result): QueryBuilder {
  const query = {} as QueryBuilder
  query.select = jest.fn(() => query)
  query.eq = jest.fn(() => query)
  query.update = jest.fn(() => query)
  query.upsert = jest.fn(() => query)
  query.insert = jest.fn(() => query)
  query.delete = jest.fn(() => query)
  query.single = jest.fn(() => Promise.resolve(singleResult))
  query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  return query
}

function supabaseWith(tables: Record<string, QueryBuilder>) {
  return {
    from: jest.fn<QueryBuilder, [string]>((table: string) => {
      const query = tables[table]
      if (!query) throw new Error(`Tabla inesperada: ${table}`)
      return query
    }),
  }
}

function authorized(supabase: ReturnType<typeof supabaseWith>): AuthResult {
  return {
    user: { id: USER_ID },
    profile: { store_id: STORE_ID, role: 'owner' },
    storeId: STORE_ID,
    supabase,
  } as unknown as AuthResult
}

function unauthorized(supabase: ReturnType<typeof supabaseWith>): AuthResult {
  return {
    error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }),
    supabase,
  } as unknown as AuthResult
}

function productParams(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: PRODUCT_ID }) }
}

function jsonRequest(url: string, body: RequestBody): Request {
  return new Request(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function bodyOf(response: Response): Promise<RequestBody> {
  return (await response.json()) as RequestBody
}

function definedResponse(response: NextResponse | undefined): NextResponse {
  if (!response) throw new Error('La ruta no devolvió respuesta')
  return response
}

describe('/api/products/[id] — contrato sin cambios', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 cuando no hay sesión', async () => {
    jest.mocked(withAuth).mockResolvedValue(unauthorized(supabaseWith({})))

    const res = await getProduct(new Request('http://localhost/api/products/prod-1'), productParams())

    expect(res.status).toBe(401)
    expect(await bodyOf(res)).toEqual({ error: 'No autorizado' })
  })

  it('200 en GET con el producto de la tienda', async () => {
    const product = { id: PRODUCT_ID, name: 'Leche' }
    const products = buildQuery({ data: product, error: null })
    jest.mocked(withAuth).mockResolvedValue(authorized(supabaseWith({ products })))

    const res = await getProduct(new Request('http://localhost/api/products/prod-1'), productParams())

    expect(res.status).toBe(200)
    expect(await bodyOf(res)).toEqual(product)
  })

  it('500 con el mensaje de Supabase cuando la fila no existe', async () => {
    const products = buildQuery({ data: null, error: { message: 'No encontrado' } })
    jest.mocked(withAuth).mockResolvedValue(authorized(supabaseWith({ products })))

    const res = await getProduct(new Request('http://localhost/api/products/prod-1'), productParams())

    expect(res.status).toBe(500)
    expect(await bodyOf(res)).toEqual({ error: 'No encontrado' })
  })

  it('400 en PATCH con un body inválido', async () => {
    const products = buildQuery({ data: null, error: null })
    jest.mocked(withAuth).mockResolvedValue(authorized(supabaseWith({ products })))

    const res = await patchProduct(
      jsonRequest('http://localhost/api/products/prod-1', { name: 'x' }),
      productParams()
    )

    expect(res.status).toBe(400)
    expect(products.update).not.toHaveBeenCalled()
  })

  it('200 en PATCH y omite las claves undefined del update', async () => {
    const products = buildQuery(
      { data: null, error: null },
      { data: { id: PRODUCT_ID, name: 'Leche 1L' }, error: null }
    )
    jest.mocked(withAuth).mockResolvedValue(authorized(supabaseWith({ products })))

    const res = await patchProduct(
      jsonRequest('http://localhost/api/products/prod-1', { name: 'Leche 1L', price: 1234 }),
      productParams()
    )

    expect(res.status).toBe(200)
    expect(products.update.mock.calls[0][0]).toEqual({ name: 'Leche 1L', price: 1234 })
  })

  it('200 en DELETE', async () => {
    const products = buildQuery({ data: null, error: null })
    jest.mocked(withAuth).mockResolvedValue(authorized(supabaseWith({ products })))

    const res = await deleteProduct(
      new Request('http://localhost/api/products/prod-1', { method: 'DELETE' }),
      productParams()
    )

    expect(res.status).toBe(200)
    expect(await bodyOf(res)).toEqual({ message: 'Producto eliminado correctamente' })
  })
})

function settingsClient(
  user: { id: string } | null,
  tables: Record<string, QueryBuilder>
): SettingsClient {
  const client = {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user }, error: null })),
    },
    from: jest.fn<QueryBuilder, [string]>((table: string) => {
      const query = tables[table]
      if (!query) throw new Error(`Tabla inesperada: ${table}`)
      return query
    }),
  }
  return client as unknown as SettingsClient
}

describe('/api/settings — contrato sin cambios', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 sin usuario', async () => {
    jest.mocked(createClient).mockResolvedValue(settingsClient(null, {}))

    const res = await getSettings()

    expect(res.status).toBe(401)
    expect(await bodyOf(res)).toEqual({ error: 'No autorizado' })
  })

  it('200 en GET con la configuración aplanada', async () => {
    const tables: Record<string, QueryBuilder> = {
      profiles: buildQuery({ data: { store_id: STORE_ID }, error: null }),
      stores: buildQuery({ data: { city: 'Santiago', commune: 'Centro', region: 'RM' }, error: null }),
      settings: buildQuery({ data: [{ key: 'store_name', value: 'Tienda' }], error: null }),
    }
    jest.mocked(createClient).mockResolvedValue(settingsClient({ id: USER_ID }, tables))

    const res = await getSettings()
    const body = await bodyOf(res)
    const settings = body.settings as { store: { name: string; city: string } }

    expect(res.status).toBe(200)
    expect(settings.store.name).toBe('Tienda')
    expect(settings.store.city).toBe('Santiago')
    expect(body.usingDefaults).toBe(false)
  })

  it('400 en PATCH con una clave inválida', async () => {
    const tables: Record<string, QueryBuilder> = {
      profiles: buildQuery({ data: { store_id: STORE_ID }, error: null }),
    }
    jest.mocked(createClient).mockResolvedValue(settingsClient({ id: USER_ID }, tables))

    const res = await patchSettings(
      jsonRequest('http://localhost/api/settings', { '1-clave': 'valor' })
    )

    expect(res.status).toBe(400)
  })

  it('200 en PATCH y sincroniza la comuna de stores', async () => {
    const settings = buildQuery({ data: null, error: null })
    const stores = buildQuery({ data: null, error: null })
    const tables: Record<string, QueryBuilder> = {
      profiles: buildQuery({ data: { store_id: STORE_ID }, error: null }),
      settings,
      stores,
    }
    jest.mocked(createClient).mockResolvedValue(settingsClient({ id: USER_ID }, tables))

    const res = await patchSettings(
      jsonRequest('http://localhost/api/settings', { store_commune: 'Centro' })
    )

    expect(res.status).toBe(200)
    expect(await bodyOf(res)).toEqual({ success: true })
    expect(stores.update.mock.calls[0][0]).toEqual({ commune: 'Centro' })
  })
})

function adminClient(tables: Record<string, QueryBuilder>): AdminClient {
  const client = {
    from: jest.fn<QueryBuilder, [string]>((table: string) => {
      const query = tables[table]
      if (!query) throw new Error(`Tabla inesperada: ${table}`)
      return query
    }),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ error: null })),
        createSignedUrl: jest.fn(() => Promise.resolve({
          data: { signedUrl: 'https://signed.example/factura.pdf' },
          error: null,
        })),
      })),
    },
  }
  return client as unknown as AdminClient
}

function uploadRequest(): NextRequest {
  const form = new FormData()
  form.append('file', new File(['contenido'], 'factura.pdf', { type: 'application/pdf' }))
  return new NextRequest('http://localhost/api/admin/inventory/adjustments/upload', {
    method: 'POST',
    body: form,
  })
}

function geminiResponse(text: string): Response {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

const ORIGINAL_GEMINI_KEY = process.env.GEMINI_API_KEY
const ORIGINAL_FETCH = globalThis.fetch

describe('/api/admin/inventory/adjustments/upload — contrato sin cambios', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-gemini-key'
  })

  afterAll(() => {
    if (ORIGINAL_GEMINI_KEY === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = ORIGINAL_GEMINI_KEY
    globalThis.fetch = ORIGINAL_FETCH
  })

  it('401 cuando no hay sesión', async () => {
    jest.mocked(withAuth).mockResolvedValue(unauthorized(supabaseWith({})))

    const res = definedResponse(await postInvoice(uploadRequest()))

    expect(res.status).toBe(401)
    expect(await bodyOf(res)).toEqual({ error: 'No autorizado' })
  })

  it('400 cuando no viene archivo', async () => {
    jest.mocked(withAuth).mockResolvedValue(authorized(supabaseWith({})))
    const request = new NextRequest('http://localhost/api/admin/inventory/adjustments/upload', {
      method: 'POST',
      body: new FormData(),
    })

    const res = definedResponse(await postInvoice(request))

    expect(res.status).toBe(400)
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('201 con el payload extraído por Gemini', async () => {
    const pending = buildQuery(
      { data: null, error: null },
      { data: { id: 'adj-1', status: 'pending' }, error: null }
    )
    jest.mocked(withAuth).mockResolvedValue(authorized(supabaseWith({})))
    jest.mocked(createAdminClient).mockReturnValue(adminClient({ pending_inventory_adjustments: pending }))
    const extracted = JSON.stringify({
      invoice_number: 'F-1',
      supplier_name: 'Proveedor',
      supplier_metadata: { phone: '123' },
      items: [{ barcode: '12345678', name: 'Leche', quantity: 2 }],
    })
    globalThis.fetch = jest.fn(() => Promise.resolve(geminiResponse(extracted))) as unknown as typeof fetch

    const res = definedResponse(await postInvoice(uploadRequest()))
    const inserted = pending.insert.mock.calls[0][0] as Array<RequestBody>

    expect(res.status).toBe(201)
    expect(inserted[0]).toMatchObject({
      invoice_number: 'F-1',
      supplier_name: 'Proveedor',
      supplier_metadata: { phone: '123' },
      status: 'pending',
    })
  })
})
