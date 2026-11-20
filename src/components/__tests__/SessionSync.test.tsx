import { act, render } from '@testing-library/react'
import { supabase } from '@/lib/supabase'
import { SessionSync } from '@/components/auth/SessionSync'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}))

jest.mock('@/stores/authStore', () => {
  const useAuthStore = jest.fn(() => ({ refreshProfile: jest.fn() }))
  return { useAuthStore: Object.assign(useAuthStore, { setState: jest.fn() }) }
})

jest.mock('@/stores/posStore', () => ({
  usePosStore: { persist: { rehydrate: jest.fn() } },
}))

jest.mock('@/stores/siiStore', () => ({
  useSiiStore: { persist: { rehydrate: jest.fn() } },
}))

jest.mock('@/stores/cartStore', () => ({
  useCartStore: { persist: { rehydrate: jest.fn() } },
}))

jest.mock('@/lib/tenant-state', () => ({
  clearTenantState: jest.fn().mockResolvedValue(undefined),
  getActiveStoreId: jest.fn(() => null),
  setActiveStoreId: jest.fn(),
}))

const onAuthStateChangeMock = jest.mocked(supabase.auth.onAuthStateChange)
const HASH_MARKER = '#session-sync-signout'

describe('SessionSync signed out navigation', () => {
  let toStringSpy: jest.SpyInstance
  let logSpy: jest.SpyInstance
  let capturedDestination: string | undefined

  beforeEach(() => {
    jest.clearAllMocks()
    capturedDestination = undefined
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    // jsdom refuses top-level navigation. Record the absolute URL the component builds
    // and let the assignment land as a hash change, which jsdom does implement.
    toStringSpy = jest.spyOn(URL.prototype, 'toString').mockImplementation(function (this: URL): string {
      capturedDestination = this.href
      return `${this.origin}${window.location.pathname}${HASH_MARKER}`
    })
  })

  afterEach(() => {
    toStringSpy.mockRestore()
    logSpy.mockRestore()
    window.history.replaceState(null, '', window.location.pathname)
  })

  it('assigns an absolute URL to location.href so session cookies are cleared by a full load', async () => {
    const { unmount } = render(<SessionSync />)

    const handler = onAuthStateChangeMock.mock.calls[0]?.[0]
    if (!handler) throw new Error('onAuthStateChange handler was not registered')

    await act(async () => {
      await handler('SIGNED_OUT', null)
    })

    expect(capturedDestination).toBe(`${window.location.origin}/`)
    expect(window.location.hash).toBe(HASH_MARKER)

    unmount()
  })
})
