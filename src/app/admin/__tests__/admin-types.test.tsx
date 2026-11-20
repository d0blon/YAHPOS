import { render, screen, waitFor } from '@testing-library/react'
import AdminProducts from '@/app/admin/productos/page'
import PendingAdjustmentsTab from '@/components/admin/PendingAdjustmentsTab'
import type { MissingProductItem } from '@/components/admin/PendingAdjustmentsTab'

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() }
}))

jest.mock('@/components/admin/ProductModal', () => {
  function ProductModalStub() {
    return null
  }
  return ProductModalStub
})

describe('admin pages sin supresiones de tipos', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('muestra los ajustes pendientes con props tipadas', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        id: 'ajuste-1',
        invoice_number: 'F-001',
        supplier_name: 'Proveedor Prueba',
        invoice_url: null,
        items: [],
        status: 'pending',
        created_at: '2026-01-01T00:00:00.000Z'
      }]
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const onProductSaved = jest.fn<void, []>()
    const onAddMissingProduct = jest.fn<void, [MissingProductItem]>()

    render(
      <PendingAdjustmentsTab
        products={[]}
        onProductSaved={onProductSaved}
        onAddMissingProduct={onAddMissingProduct}
      />
    )

    expect(await screen.findByText(/Factura #F-001/)).toBeInTheDocument()
    expect(screen.getByText(/Proveedor Prueba/)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('productos hace una sola llamada de fetch tras rerender', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => []
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const { rerender } = render(<AdminProducts />)

    expect(await screen.findByRole('heading', { name: /Gestión de Inventario/ })).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    rerender(<AdminProducts />)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
