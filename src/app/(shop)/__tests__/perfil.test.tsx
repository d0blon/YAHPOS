import { act, render, screen, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores'
import { getProducts } from '@/lib/api'
import { AppRole } from '@/lib/constants/roles'
import type { User } from '@/types'
import Profile from '@/app/(shop)/perfil/page'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

jest.mock('@/stores', () => ({
  useAuthStore: jest.fn(),
}))

jest.mock('@/lib/api', () => ({
  getProducts: jest.fn(),
}))

const routerMock = useRouter as unknown as jest.Mock
const searchParamsMock = useSearchParams as unknown as jest.Mock
const storeMock = useAuthStore as unknown as jest.Mock
const getProductsMock = getProducts as unknown as jest.Mock

const refreshProfileMock = jest.fn(() => Promise.resolve())
const logoutMock = jest.fn()
const updateUserMock = jest.fn()
const pushMock = jest.fn()

const baseUser: User = {
  id: 'user-1',
  email: 'cliente@example.com',
  firstName: 'Ana',
  lastName: 'Pérez',
  role: AppRole.CUSTOMER,
  addresses: [],
  loyaltyPoints: 10,
  identityVerified: false,
  wishlist: [],
  purchaseHistory: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

let currentUser: User

describe('perfil page profile sync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    currentUser = baseUser

    routerMock.mockReturnValue({ push: pushMock })
    searchParamsMock.mockReturnValue({ get: () => null })
    getProductsMock.mockResolvedValue([])
    storeMock.mockImplementation(() => ({
      user: currentUser,
      logout: logoutMock,
      updateUser: updateUserMock,
      refreshProfile: refreshProfileMock,
    }))
  })

  it('refreshes once and does not refetch when the user object changes', async () => {
    const { rerender } = render(<Profile />)

    await waitFor(() => {
      expect(refreshProfileMock).toHaveBeenCalledTimes(1)
    })
    expect(getProductsMock).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Información Personal')).toBeInTheDocument()
    expect(screen.getByText('Cliente')).toBeInTheDocument()

    currentUser = { ...currentUser, loyaltyPoints: currentUser.loyaltyPoints + 1 }
    rerender(<Profile />)
    await act(async () => {
      await Promise.resolve()
    })

    expect(refreshProfileMock).toHaveBeenCalledTimes(1)
    expect(getProductsMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Sincronizando...')).not.toBeInTheDocument()
  })
})
