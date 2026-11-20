import { act, render, screen, waitFor } from '@testing-library/react'
import { useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase'
import { AppRole } from '@/lib/constants/roles'
import type { User } from '@/types'
import MisTurnosPage from '@/app/(portal)/mis-turnos/page'

jest.mock('@/stores', () => ({
  useAuthStore: jest.fn(),
}))

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}))

jest.mock('sonner', () => ({
  toast: { error: jest.fn() },
}))

jest.mock('@/components/layout/Header', () => function HeaderMock() {
  return <div data-testid="header" />
})
jest.mock('@/components/layout/Footer', () => function FooterMock() {
  return <div data-testid="footer" />
})

interface ShiftRow {
  id: string
  status: string
  register_id: string | null
  start_time: string
}

type ShiftQuery = Promise<{ data: ShiftRow[] | null }> & {
  eq: (column: string, value: string) => ShiftQuery
}

const storeMock = useAuthStore as unknown as jest.Mock
const fromMock = supabase.from as unknown as jest.Mock

const shiftRows: ShiftRow[] = [
  {
    id: 'shift-1',
    status: 'active',
    register_id: 'Caja 1',
    start_time: '2026-11-20T10:00:00.000Z',
  },
]

const createShiftQuery = (): ShiftQuery => {
  const query = Promise.resolve({ data: shiftRows }) as ShiftQuery
  Object.assign(query, {
    eq: jest.fn(() => query),
  })
  return query
}

const singleMock = jest.fn(() =>
  Promise.resolve({ data: { current_area: 'Punto de Venta', store_id: 'store-1' } }),
)
const eqProfileMock = jest.fn(() => ({ single: singleMock }))
const selectProfileMock = jest.fn(() => ({ eq: eqProfileMock }))

const limitMock = jest.fn(() => createShiftQuery())
const orderMock = jest.fn(() => ({ limit: limitMock }))
const eqUserMock = jest.fn(() => ({ order: orderMock }))
const selectShiftsMock = jest.fn(() => ({ eq: eqUserMock }))

const baseUser: User = {
  id: 'user-1',
  email: 'staff@example.com',
  firstName: 'Ana',
  lastName: 'Pérez',
  role: AppRole.CASHIER,
  addresses: [],
  loyaltyPoints: 0,
  identityVerified: false,
  wishlist: [],
  purchaseHistory: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

let currentUser: User

describe('mis-turnos page profile load', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    currentUser = baseUser
    fromMock.mockImplementation((table: string) =>
      table === 'profiles' ? { select: selectProfileMock } : { select: selectShiftsMock },
    )
    storeMock.mockReturnValue({ user: currentUser, isAuthenticated: true })
  })

  it('loads once per user and does not refetch on rerender', async () => {
    const { rerender } = render(<MisTurnosPage />)

    expect(await screen.findByText('Punto de Venta')).toBeInTheDocument()
    expect(screen.getByText('Caja 1')).toBeInTheDocument()
    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledTimes(2)
    })
    expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user-1')
    expect(limitMock).toHaveBeenCalledTimes(1)

    rerender(<MisTurnosPage />)
    await act(async () => {
      await Promise.resolve()
    })

    expect(fromMock).toHaveBeenCalledTimes(2)
    expect(singleMock).toHaveBeenCalledTimes(1)
    expect(limitMock).toHaveBeenCalledTimes(1)
  })

  it('reloads exactly once when the user id changes', async () => {
    const { rerender } = render(<MisTurnosPage />)

    await screen.findByText('Caja 1')
    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledTimes(2)
    })

    currentUser = { ...currentUser, id: 'user-2' }
    storeMock.mockReturnValue({ user: currentUser, isAuthenticated: true })
    rerender(<MisTurnosPage />)

    await waitFor(() => {
      expect(fromMock).toHaveBeenCalledTimes(4)
    })
    expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user-2')
    expect(singleMock).toHaveBeenCalledTimes(2)
    expect(limitMock).toHaveBeenCalledTimes(2)
  })
})
