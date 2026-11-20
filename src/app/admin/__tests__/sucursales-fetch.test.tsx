import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import SucursalesPage from '@/app/admin/sucursales/page'
import { supabase } from '@/lib/supabase'
import { useSaaS } from '@/providers/SaaSProvider'

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}))

jest.mock('@/providers/SaaSProvider', () => ({ useSaaS: jest.fn() }))

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }))

describe('SucursalesPage fetch', () => {
  const fromMock = supabase.from as jest.Mock
  const useSaaSMock = useSaaS as jest.Mock
  let limitMock: jest.Mock
  let eqMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    useSaaSMock.mockReturnValue({ storeId: 'tienda-1' })

    limitMock = jest.fn().mockResolvedValue({ data: [], error: null })
    const orderMock = jest.fn(() => ({ limit: limitMock }))
    eqMock = jest.fn(() => ({ order: orderMock }))
    const selectMock = jest.fn(() => ({ eq: eqMock }))

    fromMock.mockReturnValue({ select: selectMock })
  })

  it('does not re-run the fetch effect after state settles', async () => {
    const { rerender } = render(<SucursalesPage />)

    expect(await screen.findByText(/No se encontraron sucursales/)).toBeInTheDocument()
    await waitFor(() => expect(limitMock).toHaveBeenCalledTimes(1))
    expect(fromMock).toHaveBeenCalledWith('branches')
    expect(eqMock).toHaveBeenCalledWith('store_id', 'tienda-1')

    rerender(<SucursalesPage />)
    expect(limitMock).toHaveBeenCalledTimes(1)
  })
})
