import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminClientes from '@/app/admin/clientes/page'

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() }
}))

describe('AdminClientes fetch', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('reports a failed fetch instead of failing silently', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('Fallo de red'))
    global.fetch = fetchMock as unknown as typeof fetch

    render(<AdminClientes />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Fallo de red')
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('does not re-run the mount effect after state settles', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'cliente-1', name: 'Ana Prueba', rut: '11.111.111-1', email: 'ana@ejemplo.cl', loyalty_points: 7, createdAt: '2026-01-01' }
      ]
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const { rerender } = render(<AdminClientes />)

    expect(await screen.findByText('Ana Prueba')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    rerender(<AdminClientes />)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
