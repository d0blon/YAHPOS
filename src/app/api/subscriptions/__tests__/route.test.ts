/** @jest-environment node */

import { createClient } from '@/lib/supabase'
import { GET } from '@/app/api/subscriptions/route'

jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(),
}))

interface QueryError {
  code: string
  message: string
}

interface QueryResult {
  data: unknown
  error: QueryError | null
}

interface SupabaseQuery {
  select: jest.Mock<SupabaseQuery, [string]>
  eq: jest.Mock<SupabaseQuery, [string, string]>
  single: jest.Mock<Promise<QueryResult>, []>
  order: jest.Mock<SupabaseQuery, [string, { ascending: boolean }]>
  limit: jest.Mock<SupabaseQuery, [number]>
  then<TResult1 = QueryResult, TResult2 = never>(
    onFulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>
}

interface AuthResult {
  data: { user: { id: string } | null }
}

interface SupabaseClientMock {
  auth: {
    getUser: jest.Mock<Promise<AuthResult>, []>
  }
  from: jest.Mock<SupabaseQuery, [string]>
}

interface ResponseBody {
  subscription: { store_id: string } | null
  tiers: Array<{ id: string }> | null
  error?: string
}

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>
const USER_ID = 'user-1'
const STORE_ID = 'store-1'
const PROFILE_TABLE = 'profiles'
const SUBSCRIPTION_TABLE = 'subscriptions'
const TIER_TABLE = 'subscription_tiers'

function buildQuery(result: QueryResult): SupabaseQuery {
  const query: SupabaseQuery = {
    select: jest.fn<SupabaseQuery, [string]>(),
    eq: jest.fn<SupabaseQuery, [string, string]>(),
    single: jest.fn<Promise<QueryResult>, []>(),
    order: jest.fn<SupabaseQuery, [string, { ascending: boolean }]>(),
    limit: jest.fn<SupabaseQuery, [number]>(),
    then: <TResult1 = QueryResult, TResult2 = never>(
      onFulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
      onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2> => Promise.resolve(result).then(onFulfilled, onRejected),
  }

  query.select.mockReturnValue(query)
  query.eq.mockReturnValue(query)
  query.order.mockReturnValue(query)
  query.limit.mockReturnValue(query)
  query.single.mockResolvedValue(result)

  return query
}

function configure(profile: QueryResult, subscription: QueryResult, tiers: QueryResult, user: AuthResult['data']['user'] = { id: USER_ID }) {
  const profileQuery = buildQuery(profile)
  const subscriptionQuery = buildQuery(subscription)
  const tierQuery = buildQuery(tiers)

  const client: SupabaseClientMock = {
    auth: {
      getUser: jest.fn<Promise<AuthResult>, []>().mockResolvedValue({ data: { user } }),
    },
    from: jest.fn<SupabaseQuery, [string]>(),
  }

  const queries: Record<string, SupabaseQuery> = {
    [PROFILE_TABLE]: profileQuery,
    [SUBSCRIPTION_TABLE]: subscriptionQuery,
    [TIER_TABLE]: tierQuery,
  }

  client.from.mockImplementation((table: string) => {
    const query = queries[table]
    if (!query) throw new Error(`Tabla inesperada: ${table}`)
    return query
  })

  mockedCreateClient.mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof createClient>>
  )

  return { client, profileQuery, subscriptionQuery, tierQuery }
}

async function bodyOf(response: Response): Promise<ResponseBody> {
  return (await response.json()) as ResponseBody
}

beforeEach(() => {
  mockedCreateClient.mockReset()
})

describe('GET /api/subscriptions', () => {
  it('devuelve suscripción y tiers con scope por store_id', async () => {
    const subscriptionRow = { id: 'sub-1', store_id: STORE_ID, tier_id: 'tier-1' }
    const tierRows = [{ id: 'tier-1', name: 'Básico' }]
    const { profileQuery, subscriptionQuery, tierQuery } = configure(
      { data: { store_id: STORE_ID }, error: null },
      { data: subscriptionRow, error: null },
      { data: tierRows, error: null },
    )

    const response = await GET()
    const body = await bodyOf(response)

    expect(response.status).toBe(200)
    expect(body.subscription).toEqual(subscriptionRow)
    expect(body.tiers).toEqual(tierRows)
    expect(profileQuery.eq).toHaveBeenCalledWith('id', USER_ID)
    expect(subscriptionQuery.eq).toHaveBeenCalledWith('store_id', STORE_ID)
    expect(tierQuery.order).toHaveBeenCalledWith('price_clp', { ascending: true })
    expect(tierQuery.limit).toHaveBeenCalledWith(50)
  })

  it('responde 500 con el mensaje real si falla la consulta de tiers', async () => {
    const tiersMessage = 'subscription_tiers: DB caída'
    const { subscriptionQuery } = configure(
      { data: { store_id: STORE_ID }, error: null },
      { data: null, error: null },
      { data: null, error: { code: 'PGRST500', message: tiersMessage } },
    )

    const response = await GET()
    const body = await bodyOf(response)

    expect(response.status).toBe(500)
    expect(body.error).toBe(tiersMessage)
    expect(body.tiers).toBeUndefined()
    expect(subscriptionQuery.eq).toHaveBeenCalledWith('store_id', STORE_ID)
  })

  it('trata PGRST116 como ausencia de suscripción sin ocultar error de tiers', async () => {
    const tierRows = [{ id: 'tier-1', name: 'Básico' }]
    configure(
      { data: { store_id: STORE_ID }, error: null },
      { data: null, error: { code: 'PGRST116', message: 'no rows' } },
      { data: tierRows, error: null },
    )

    const response = await GET()
    const body = await bodyOf(response)

    expect(response.status).toBe(200)
    expect(body.subscription).toBeNull()
    expect(body.tiers).toEqual(tierRows)
  })

  it('responde 403 si el usuario no tiene store', async () => {
    const { subscriptionQuery, tierQuery } = configure(
      { data: null, error: null },
      { data: null, error: null },
      { data: [], error: null },
    )

    const response = await GET()
    const body = await bodyOf(response)

    expect(response.status).toBe(403)
    expect(body.error).toBe('No store')
    expect(subscriptionQuery.single).not.toHaveBeenCalled()
    expect(tierQuery.single).not.toHaveBeenCalled()
  })

  it('responde 401 si no hay usuario autenticado', async () => {
    configure(
      { data: null, error: null },
      { data: null, error: null },
      { data: [], error: null },
      null,
    )

    const response = await GET()
    const body = await bodyOf(response)

    expect(response.status).toBe(401)
    expect(body.error).toBe('No autorizado')
  })
})
