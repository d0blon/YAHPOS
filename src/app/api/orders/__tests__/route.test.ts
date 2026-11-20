/** @jest-environment node */
import { POST } from '../route'
import { withAuth } from '@/lib/api-utils'

jest.mock('@/lib/api-utils', () => ({ withAuth: jest.fn() }))
jest.mock('@/lib/supabase', () => ({ createClient: jest.fn() }))

const PRODUCT_PRICE = 5000
const QUANTITY = 2
const ORDER_TOTAL = PRODUCT_PRICE * QUANTITY
const ACCUMULATION_RATE = 100

type QueryBuilder = {
  select: jest.Mock
  eq: jest.Mock
  in: jest.Mock
  insert: jest.Mock
  update: jest.Mock
  single: jest.Mock
  then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>
}

function query(result: unknown, singleResult: unknown = result): QueryBuilder {
  const builder = {} as QueryBuilder
  builder.select = jest.fn(() => builder)
  builder.eq = jest.fn(() => builder)
  builder.in = jest.fn(() => builder)
  builder.insert = jest.fn(() => builder)
  builder.update = jest.fn(() => builder)
  builder.single = jest.fn(() => Promise.resolve(singleResult))
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  return builder
}

function setup(productPrice = PRODUCT_PRICE, settings: Array<{ key: string; value: string }> = []) {
  const products = query(
    { data: [{ id: 'prod-1', price: productPrice }], error: null },
    { data: { stock: 10 }, error: null }
  )
  const settingsTable = query({ data: settings, error: null })
  const orders = query({ data: { id: 'order-1' }, error: null })
  const payments = query({ error: null })
  const orderItems = query({ error: null })
  const tables: Record<string, QueryBuilder> = {
    products,
    settings: settingsTable,
    orders,
    payments,
    order_items: orderItems,
  }
  const supabase = {
    from: jest.fn((table: string) => tables[table] ?? query({ data: null, error: null })),
  }

  jest.mocked(withAuth).mockResolvedValue({
    user: { id: 'user-1' },
    storeId: 'store-1',
    supabase,
  } as unknown as Awaited<ReturnType<typeof withAuth>>)

  return { supabase, products, orders, payments, orderItems }
}

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function loyaltyMetadata(orderInsert: unknown[][]): Record<string, number> {
  const rows = orderInsert[0][0] as Array<Record<string, unknown>>
  return (rows[0].metadata as { loyalty: Record<string, number> }).loyalty
}

describe('POST /api/orders — valores del cliente', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rechaza un total menor al precio real de los productos', async () => {
    setup()
    const res = await POST(makeRequest({
      total: 100,
      paymentMethod: 'webpay',
      source: 'ecommerce',
      items: [{ productId: 'prod-1', quantity: QUANTITY, price: 1 }],
    }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'El total no coincide con el precio real de los productos' })
  })

  it('recalcula puntos desde la configuración y usa precios reales, no los del cliente', async () => {
    const { orders, orderItems } = setup(PRODUCT_PRICE, [
      { key: 'loyalty_enabled', value: 'true' },
      { key: 'loyalty_accumulation_rate', value: String(ACCUMULATION_RATE) },
    ])

    const res = await POST(makeRequest({
      total: ORDER_TOTAL,
      subtotal: 1,
      pointsToEarn: 9999,
      pointsRedeemed: 0,
      paymentMethod: 'webpay',
      source: 'ecommerce',
      items: [{ productId: 'prod-1', quantity: QUANTITY, price: 1 }],
    }))

    expect(res.status).toBe(201)
    expect(loyaltyMetadata(orders.insert.mock.calls)).toEqual({
      points_earned: ORDER_TOTAL / ACCUMULATION_RATE,
      points_redeemed: 0,
      accumulation_rate: ACCUMULATION_RATE,
    })

    const insertedItems = orderItems.insert.mock.calls[0][0] as Array<Record<string, unknown>>
    expect(insertedItems[0].price).toBe(PRODUCT_PRICE)
  })

  it('no otorga puntos aunque el cliente envíe pointsToEarn si la fidelización está desactivada', async () => {
    const { orders } = setup(PRODUCT_PRICE, [{ key: 'loyalty_enabled', value: 'false' }])

    const res = await POST(makeRequest({
      total: ORDER_TOTAL,
      pointsToEarn: 9999,
      paymentMethod: 'webpay',
      source: 'ecommerce',
      items: [{ productId: 'prod-1', quantity: QUANTITY, price: 1 }],
    }))

    expect(res.status).toBe(201)
    expect(loyaltyMetadata(orders.insert.mock.calls).points_earned).toBe(0)
  })
})
