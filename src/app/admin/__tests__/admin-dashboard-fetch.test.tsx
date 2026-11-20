import React from 'react'
import type { ReactNode } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import AdminDashboard from '@/app/admin/page'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children
}))

jest.mock('recharts', () => ({
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <>{children}</>,
  PieChart: () => null,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null
}))

jest.mock('@/components/admin/SalesTrendChart', () => ({ SalesTrendChart: () => null }))

jest.mock('@/components/admin/SectionCard', () => ({
  SectionCard: ({ children }: { children: ReactNode }) => <>{children}</>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  )
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}))

describe('AdminDashboard fetch', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('does not re-run the mount effect after state settles', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        stats: [],
        recentOrders: [],
        topProducts: [],
        branches: []
      })
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const { rerender } = render(<AdminDashboard />)

    expect(await screen.findByText('No se encontraron pedidos')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    rerender(<AdminDashboard />)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
