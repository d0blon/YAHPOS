import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { SaaSProvider, useSaaS } from '../SaaSProvider'
import { getStoreSettingsAction } from '@/app/developer/actions'
import { supabase } from '@/lib/supabase'
import { setActiveStoreId } from '@/lib/tenant-state'

jest.mock('@/app/developer/actions', () => ({
  getStoreSettingsAction: jest.fn(),
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    channel: jest.fn(),
    auth: { onAuthStateChange: jest.fn() },
    removeChannel: jest.fn(),
  },
}))

jest.mock('@/lib/tenant-state', () => ({
  setActiveStoreId: jest.fn(),
}))

type RealtimePayload = { new: unknown }
type RealtimeHandler = (payload: RealtimePayload) => void
type AuthHandler = (event: string) => void
type FilterDescriptor = Record<string, string>

interface ChannelMock {
  on: jest.Mock
  subscribe: jest.Mock
}

interface SupabaseMock {
  channel: jest.Mock
  auth: { onAuthStateChange: jest.Mock }
  removeChannel: jest.Mock
}

interface StoreRowFixture {
  id: string
  name: string
  slug: string
  tier: string
  config: {
    store_logo: string | null
    tax_id: string | null
    white_label_enabled: boolean
    accent_color: string
    appearance_primary_color: string
    surface_color: string | null
  } | null
  is_active: boolean
}

const mockGetStoreSettingsAction = jest.mocked(getStoreSettingsAction)
const mockSetActiveStoreId = jest.mocked(setActiveStoreId)
const mockSupabase = supabase as unknown as SupabaseMock

let realtimeHandler: RealtimeHandler | undefined
let authHandler: AuthHandler | undefined
const channelOnCalls: Array<{ event: string; filter: FilterDescriptor }> = []
const authSubscription = { unsubscribe: jest.fn() }
const channelBuilder: ChannelMock = {
  on: jest.fn(),
  subscribe: jest.fn(),
}

const INITIAL_CONFIG = {
  tier: 'austral',
  store_name: 'Config Inicial',
  store_logo: null,
  tax_id: null,
  white_label_enabled: false,
  accent_color: '#003399',
  appearance_primary_color: '#4b0082',
  surface_color: null,
} as const

function storeRow(overrides: Partial<StoreRowFixture> = {}): StoreRowFixture {
  return {
    id: 'store-a',
    name: 'Tienda A',
    slug: 'tienda-a',
    tier: 'archipielago',
    config: {
      store_logo: null,
      tax_id: null,
      white_label_enabled: false,
      accent_color: '#003399',
      appearance_primary_color: '#4b0082',
      surface_color: null,
    },
    is_active: true,
    ...overrides,
  }
}

function Probe({ onContext }: { onContext: (value: unknown) => void }) {
  const saas = useSaaS()

  useEffect(() => {
    onContext(saas)
  }, [saas, onContext])

  return (
    <div>
      <span data-testid="store">{saas.storeId ?? 'none'}</span>
      <span data-testid="loading">{String(saas.isLoading)}</span>
      <span data-testid="name">{saas.config.store_name}</span>
      <button onClick={() => { void saas.refreshConfig() }}>refresh</button>
    </div>
  )
}

beforeEach(() => {
  jest.resetAllMocks()
  realtimeHandler = undefined
  authHandler = undefined
  channelOnCalls.length = 0

  channelBuilder.on.mockImplementation((event: string, filter: FilterDescriptor, handler: RealtimeHandler) => {
    channelOnCalls.push({ event, filter })
    realtimeHandler = handler
    return channelBuilder
  })
  channelBuilder.subscribe.mockImplementation(() => channelBuilder)

  mockSupabase.channel.mockReturnValue(channelBuilder)
  mockSupabase.auth.onAuthStateChange.mockImplementation((handler: AuthHandler) => {
    authHandler = handler
    return { data: { subscription: authSubscription } }
  })
  mockGetStoreSettingsAction.mockImplementation(async () => null)
})

describe('SaaSProvider', () => {
  it('config inicial no dispara fetch ni setState síncrono', async () => {
    const onContext = jest.fn()

    render(
      <SaaSProvider initialStoreId="store-a" initialConfig={INITIAL_CONFIG}>
        <Probe onContext={onContext} />
      </SaaSProvider>
    )

    expect(mockGetStoreSettingsAction).not.toHaveBeenCalled()
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
    expect(screen.getByTestId('name')).toHaveTextContent('Config Inicial')

    await waitFor(() => expect(onContext).toHaveBeenCalledTimes(1))
    expect(onContext).toHaveBeenCalledTimes(1)
  })

  it('refreshConfig fuerza fetch y aplica scope por store_id', async () => {
    mockGetStoreSettingsAction.mockImplementation(async () => storeRow({ name: 'Tienda Refrescada' }))

    render(
      <SaaSProvider initialStoreId="store-a" initialConfig={INITIAL_CONFIG}>
        <Probe onContext={jest.fn()} />
      </SaaSProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'refresh' }))

    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Tienda Refrescada'))
    expect(mockGetStoreSettingsAction).toHaveBeenCalledTimes(1)
    expect(mockGetStoreSettingsAction).toHaveBeenCalledWith('store-a')
    expect(mockSetActiveStoreId).toHaveBeenCalledWith('store-a')
    expect(screen.getByTestId('store')).toHaveTextContent('store-a')
  })

  it('payload Realtime actualiza config con valores del mismo store', async () => {
    render(
      <SaaSProvider initialStoreId="store-a" initialConfig={INITIAL_CONFIG}>
        <Probe onContext={jest.fn()} />
      </SaaSProvider>
    )

    await waitFor(() => expect(realtimeHandler).toBeDefined())
    expect(channelOnCalls).toEqual([
      {
        event: 'postgres_changes',
        filter: {
          event: 'UPDATE',
          schema: 'public',
          table: 'stores',
          filter: 'id=eq.store-a',
        },
      },
    ])

    act(() => {
      realtimeHandler?.({ new: { id: 'store-b', name: 'Tienda Ajena', tier: 'patagonia', config: null } })
      realtimeHandler?.({
        new: {
          id: 'store-a',
          name: 'Tienda Realtime',
          tier: 'patagonia',
          config: { accent_color: '#111111' },
        },
      })
    })

    expect(screen.getByTestId('name')).toHaveTextContent('Tienda Realtime')
  })

  it('sin initialStoreId no hay fetch y store activo es null', async () => {
    const onContext = jest.fn()

    render(
      <SaaSProvider>
        <Probe onContext={onContext} />
      </SaaSProvider>
    )

    expect(mockGetStoreSettingsAction).not.toHaveBeenCalled()
    expect(screen.getByTestId('store')).toHaveTextContent('none')
    expect(screen.getByTestId('loading')).toHaveTextContent('false')

    await waitFor(() => expect(mockSetActiveStoreId).toHaveBeenCalledWith(null))
    expect(mockSupabase.channel).not.toHaveBeenCalled()
    expect(onContext).toHaveBeenCalledTimes(1)
  })

  it('cleanup de channel y auth subscription al desmontar', async () => {
    const { unmount } = render(
      <SaaSProvider initialStoreId="store-a" initialConfig={INITIAL_CONFIG}>
        <Probe onContext={jest.fn()} />
      </SaaSProvider>
    )

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith('store-changes-store-a')
      expect(authHandler).toBeDefined()
    })

    unmount()

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(channelBuilder)
    expect(authSubscription.unsubscribe).toHaveBeenCalledTimes(1)
  })
})
