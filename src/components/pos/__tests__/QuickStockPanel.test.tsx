import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QuickStockPanel } from '@/components/pos/QuickStockPanel'
import type { Product } from '@/types'

interface FilterCall { column: string; value: unknown }
interface UpdateCall { table: string; values: Record<string, unknown>; filters: FilterCall[] }

const mockUpdates: UpdateCall[] = []
const mockBranchRows: Array<{ id: string }> = [{ id: 'inventory-1' }]
const mockSaaState: { storeId: string | null } = { storeId: 'tenant-1' }
const mockSetInventory = jest.fn()
const mockPosState: {
  inventory: Product[]
  setInventory: jest.Mock
  selectedBranchId: string | null
} = {
  inventory: [],
  setInventory: mockSetInventory,
  selectedBranchId: null,
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      update: (values: Record<string, unknown>) => {
        const call: UpdateCall = { table, values, filters: [] }
        mockUpdates.push(call)
        const query = {
          eq: (column: string, value: unknown) => {
            call.filters.push({ column, value })
            return query
          },
          select: () => Promise.resolve({ data: mockBranchRows, error: null }),
          then: (onFulfilled: (result: { data: null; error: null }) => unknown) =>
            Promise.resolve({ data: null, error: null }).then(onFulfilled),
        }
        return query
      },
    }),
  },
}))

jest.mock('@/providers/SaaSProvider', () => ({ useSaaS: () => mockSaaState }))

jest.mock('@/stores/posStore', () => ({ usePosStore: () => mockPosState }))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const sonnerToast = jest.requireMock<{ toast: { success: jest.Mock; error: jest.Mock } }>('sonner').toast

const product: Product = {
  id: 'product-1',
  name: 'Leche',
  slug: 'leche',
  description: '',
  price: 1000,
  image: 'data:image/png;base64,QUJD',
  category: { id: 'cat-1', name: 'Lácteos', slug: 'lacteos', isActive: true, order: 1 },
  categorySlug: 'lacteos',
  categoryId: 'cat-1',
  stock: 10,
  sku: 'LEC-1',
  unit: 'un',
  isActive: true,
  isFeatured: false,
  lowStockThreshold: 5,
  isRealtimeTracked: true,
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
}

const saveStock = () => {
  fireEvent.click(screen.getByText('+5'))
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
}

const filtersOf = (table: string) => mockUpdates.filter(call => call.table === table)

describe('QuickStockPanel scoped stock update', () => {
  beforeEach(() => {
    mockUpdates.length = 0
    mockBranchRows.length = 1
    mockBranchRows[0] = { id: 'inventory-1' }
    mockSaaState.storeId = 'tenant-1'
    mockPosState.selectedBranchId = null
    mockPosState.inventory = [product]
    mockPosState.setInventory.mockClear()
    sonnerToast.error.mockClear()
    sonnerToast.success.mockClear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders the product image through next/image', () => {
    render(<QuickStockPanel isOpen onClose={jest.fn()} />)

    const image = screen.getByAltText('Leche')
    expect(image.tagName).toBe('IMG')
    expect(image.getAttribute('src')).toContain('data:image/png;base64')
    expect(image).toHaveClass('object-contain')
  })

  it('writes branch stock and mirrors global stock, both scoped by tenant', async () => {
    mockPosState.selectedBranchId = 'branch-1'
    render(<QuickStockPanel isOpen onClose={jest.fn()} />)

    saveStock()

    await waitFor(() => expect(mockUpdates).toHaveLength(2))

    const branchUpdate = filtersOf('inventory')[0]
    expect(branchUpdate.values).toEqual({ stock: 15 })
    expect(branchUpdate.filters).toEqual([
      { column: 'product_id', value: 'product-1' },
      { column: 'branch_id', value: 'branch-1' },
      { column: 'store_id', value: 'tenant-1' },
    ])

    const globalUpdate = filtersOf('products')[0]
    expect(globalUpdate.filters).toEqual([
      { column: 'id', value: 'product-1' },
      { column: 'store_id', value: 'tenant-1' },
    ])
    expect(sonnerToast.success).toHaveBeenCalled()
  })

  it('keeps the global-only update when no branch is selected', async () => {
    render(<QuickStockPanel isOpen onClose={jest.fn()} />)

    saveStock()

    await waitFor(() => expect(mockUpdates).toHaveLength(1))
    expect(filtersOf('inventory')).toHaveLength(0)
    expect(filtersOf('products')[0].filters).toEqual([
      { column: 'id', value: 'product-1' },
      { column: 'store_id', value: 'tenant-1' },
    ])
  })

  it('fails closed when the tenant is unknown', async () => {
    mockSaaState.storeId = null
    render(<QuickStockPanel isOpen onClose={jest.fn()} />)

    saveStock()

    await waitFor(() => expect(sonnerToast.error).toHaveBeenCalled())
    expect(mockUpdates).toHaveLength(0)
  })
})
