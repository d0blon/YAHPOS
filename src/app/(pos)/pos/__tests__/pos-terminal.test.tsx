import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from 'react'
import type { CashSession, PosItem, PosSettings } from '@/stores/posStore'
import type { Product } from '@/types'

interface BroadcastCall {
  type?: string
  discount?: number
  itemsCount?: number
  cashierName?: string
}

interface MockPosState {
  items: PosItem[]
  totalItems: number
  total: number
  subtotal: number
  addItem: jest.Mock
  updateQuantity: jest.Mock
  removeItem: jest.Mock
  clearPos: jest.Mock
  customerRut?: string
  customerName?: string
  customerPoints?: number
  pointsToEarn: number
  suspendCurrentOrder: jest.Mock
  resumeOrder: jest.Mock
  removeSuspendedOrder: jest.Mock
  suspendedOrders: unknown[]
  inventory: Product[]
  setInventory: jest.Mock
  processCheckoutStock: jest.Mock
  salesHistory: unknown[]
  addSale: jest.Mock
  isTrainingMode: boolean
  currentUser: null
  setCurrentUser: jest.Mock
  settings: PosSettings
  cashSession: CashSession | null
  setCashSession: jest.Mock
  addGenericItem: jest.Mock
  pointsRedeemed: number
  setPointsRedeemed: jest.Mock
  isSyncing: boolean
  isInitialLoading: boolean
  selectedBranchId: string | null
  setSelectedBranchId: jest.Mock
  isFullAccount: boolean
  identityVerified: boolean
  updateSettings: jest.Mock
  loadDraftFromServer: jest.Mock
  syncDraftToServer: jest.Mock
}

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: HTMLAttributes<HTMLDivElement>) => <div {...props} />,
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

jest.mock('@/components/pos/PosReceiptModal', () => ({ PosReceiptModal: () => null }))
jest.mock('@/components/pos/WeightInputModal', () => ({ WeightInputModal: () => null }))
jest.mock('@/components/pos/SalesHistoryModal', () => ({ SalesHistoryModal: () => null }))
jest.mock('@/components/pos/DailyClosureModal', () => ({ DailyClosureModal: () => null }))
jest.mock('@/components/pos/PosSettingsModal', () => ({ PosSettingsModal: () => null }))
jest.mock('@/components/pos/ManagerPinModal', () => ({ ManagerPinModal: () => null }))
jest.mock('@/components/pos/CashOpeningModal', () => ({ CashOpeningModal: () => null }))
jest.mock('@/components/pos/CustomerModal', () => ({ __esModule: true, default: () => null }))
jest.mock('@/components/pos/PosSidebar', () => ({ PosSidebar: () => null }))
jest.mock('@/components/pos/OfflineSyncManager', () => ({ OfflineSyncManager: () => null }))
jest.mock('@/components/pos/CashMovementModal', () => ({ CashMovementModal: () => null }))
jest.mock('@/components/pos/MovementReceiptModal', () => ({ MovementReceiptModal: () => null }))
jest.mock('@/components/pos/SyncOverlay', () => ({ SyncOverlay: () => null }))
jest.mock('@/components/pos/RealTimeStockBadge', () => ({ RealTimeStockBadge: () => null }))
jest.mock('@/components/pos/QuickStockPanel', () => ({ QuickStockPanel: () => null }))
jest.mock('@/components/pos/RemoteClosureListener', () => ({ RemoteClosureListener: () => null }))

jest.mock('@/components/pos/PaymentModal', () => {
  const confirmRef: { current: (() => void) | null } = { current: null }
  return {
    confirmRefExport: confirmRef,
    PaymentModal: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: (method: 'EFECTIVO') => void }) => {
      confirmRef.current = () => onConfirm('EFECTIVO')
      return isOpen ? <button onClick={() => onConfirm('EFECTIVO')}>Confirmar pago</button> : null
    },
  }
})

jest.mock('@/lib/hooks/useCustomerDisplaySync', () => {
  const broadcast = jest.fn()
  return {
    broadcastMockExport: broadcast,
    useCustomerDisplayBroadcast: () => ({ broadcast }),
    useCustomerDisplayReceiver: () => ({ data: null, isConnected: true }),
  }
})

jest.mock('@/stores/posStore', () => {
  const settings: PosSettings = {
    blindClosureEnabled: true,
    pinRequiredForDelete: false,
    supervisorPin: '',
    loyaltyEnabled: true,
    loyalty: { accumulationRate: 0.01, redemptionRate: 2, redemptionMultiple: 100 },
    siiEmission: 'always',
  }
  const cashSession: CashSession = {
    id: 7,
    terminal_id: 3,
    terminal_name: 'Caja 1',
    cashier_name: 'Ana',
    opening_amount: 0,
    opened_at: '',
    status: 'open',
  }
  const state: MockPosState = {
    items: [],
    totalItems: 0,
    total: 0,
    subtotal: 0,
    addItem: jest.fn(),
    updateQuantity: jest.fn(),
    removeItem: jest.fn(),
    clearPos: jest.fn(),
    pointsToEarn: 0,
    suspendCurrentOrder: jest.fn(),
    resumeOrder: jest.fn(),
    removeSuspendedOrder: jest.fn(),
    suspendedOrders: [],
    inventory: [],
    setInventory: jest.fn(),
    processCheckoutStock: jest.fn(),
    salesHistory: [],
    addSale: jest.fn(),
    isTrainingMode: false,
    currentUser: null,
    setCurrentUser: jest.fn(),
    settings,
    cashSession,
    setCashSession: jest.fn(),
    addGenericItem: jest.fn(),
    pointsRedeemed: 0,
    setPointsRedeemed: jest.fn(),
    isSyncing: false,
    isInitialLoading: false,
    selectedBranchId: null,
    setSelectedBranchId: jest.fn(),
    isFullAccount: true,
    identityVerified: true,
    updateSettings: jest.fn(async () => {}),
    loadDraftFromServer: jest.fn(async () => {}),
    syncDraftToServer: jest.fn(async () => {}),
  }
  const usePosStore = Object.assign(jest.fn(() => state), {
    getState: jest.fn(() => state),
    setState: jest.fn((partial: Partial<MockPosState>) => Object.assign(state, partial)),
  })
  return { usePosStore, posStateExport: state }
})

jest.mock('@/stores/authStore', () => {
  const session = { user: { id: 'auth-1', firstName: 'Ana', lastName: 'Pérez' }, isAuthenticated: true }
  return {
    useAuthStore: Object.assign(jest.fn(() => session), {
      getState: jest.fn(() => session),
    }),
  }
})

jest.mock('@/stores/siiStore', () => ({
  useSiiStore: {
    getState: jest.fn(() => ({
      consumeFolio: jest.fn(),
      addToQueue: jest.fn(),
      removeFromQueue: jest.fn(),
    })),
  },
}))

jest.mock('@/providers/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', setTheme: jest.fn() }),
}))

jest.mock('@/providers/SaaSProvider', () => ({
  useSaaS: () => ({
    config: {
      id: 'store-1',
      tier: 'patagonia',
      store_name: 'Tienda Prueba',
      store_logo: undefined,
      white_label_enabled: false,
    },
    storeId: 'store-1',
  }),
}))

jest.mock('@/lib/api', () => ({
  getProducts: jest.fn(async () => []),
  getBranches: jest.fn(async () => []),
}))

jest.mock('@/lib/supabase', () => {
  interface RealtimeChannelStub {
    on: jest.Mock
    subscribe: jest.Mock
  }
  const channel: RealtimeChannelStub = { on: jest.fn(), subscribe: jest.fn() }
  channel.on.mockReturnValue(channel)
  channel.subscribe.mockReturnValue(channel)
  return {
    supabase: {
      auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })) },
      channel: jest.fn(() => channel),
      removeChannel: jest.fn(),
    },
  }
})

jest.mock('@/lib/hardware/hardwareStore', () => ({
  useHardwareStore: { getState: jest.fn(() => ({ init: jest.fn() })) },
}))

jest.mock('@/lib/pos/sii-decision', () => ({
  decideSiiEmission: jest.fn(() => ({ kind: 'voucher', reason: 'test' })),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}))

import PosTerminal, { getAdminUrl } from '../page'

const { broadcastMockExport: broadcastMock } = jest.requireMock('@/lib/hooks/useCustomerDisplaySync') as {
  broadcastMockExport: jest.Mock
}
const { posStateExport: posState } = jest.requireMock('@/stores/posStore') as { posStateExport: MockPosState }
const { confirmRefExport: confirmRef } = jest.requireMock('@/components/pos/PaymentModal') as {
  confirmRefExport: { current: (() => void) | null }
}

const makeProduct = (): Product => ({
  id: 'p1',
  name: 'Café',
  price: 5000,
  stock: 10,
  lowStockThreshold: 2,
  unit: 'un',
  category: 'abarrotes',
} as unknown as Product)

const originalFetch = global.fetch
let fetchMock: jest.Mock

const resetState = () => {
  posState.items = [{ product: makeProduct(), quantity: 1 }]
  posState.totalItems = 1
  posState.subtotal = 5000
  posState.total = 4800
  posState.pointsRedeemed = 100
  posState.pointsToEarn = 50
  posState.customerRut = '12.345.678-9'
  posState.customerName = 'Cliente Prueba'
  posState.customerPoints = 500
  posState.settings.loyalty = { accumulationRate: 0.01, redemptionRate: 2, redemptionMultiple: 100 }
}

beforeEach(() => {
  jest.clearAllMocks()
  resetState()
  fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url === '/api/settings') {
      return { ok: true, json: async () => ({ settings: {} }) } as unknown as Response
    }
    return { ok: true, json: async () => ({}) } as unknown as Response
  })
  global.fetch = fetchMock as typeof fetch
})

afterEach(() => {
  global.fetch = originalFetch
  jest.restoreAllMocks()
})

describe('PosTerminal', () => {
  it('broadcast de carrito usa redemptionRate real y no dispara loops', async () => {
    render(<PosTerminal />)

    await waitFor(() => expect(broadcastMock).toHaveBeenCalledTimes(1))

    const calls = broadcastMock.mock.calls.map((call: unknown[]) => call[0] as BroadcastCall)
    const cartUpdate = calls.find(call => call.type === 'cart-update')
    expect(cartUpdate?.discount).toBe(200)
    expect(cartUpdate?.itemsCount).toBe(1)
    expect(cartUpdate?.cashierName).toBe('Ana Pérez')
  })

  it('muestra totalItems en el carrito', async () => {
    posState.totalItems = 2
    render(<PosTerminal />)

    expect(await screen.findByText(/Ticket Venta/)).toHaveTextContent('(2)')
  })

  it('destino de navegación a /admin es absoluto', () => {
    expect(getAdminUrl()).toBe(`${window.location.origin}/admin`)
    expect(getAdminUrl()).toMatch(/^https?:\/\//)
  })

  it('bloquea doble canje de puntos durante el checkout', async () => {
    render(<PosTerminal />)

    fireEvent.click(await screen.findByRole('button', { name: /cobrar ahora/i }))
    expect(confirmRef.current).not.toBeNull()

    await act(async () => {
      const first = confirmRef.current?.()
      const second = confirmRef.current?.()
      await Promise.all([first, second])
    })

    const orderCalls = fetchMock.mock.calls.filter((call: unknown[]) => String(call[0]) === '/api/orders')
    expect(orderCalls).toHaveLength(1)
    expect(posState.setPointsRedeemed).toHaveBeenCalledTimes(1)
    expect(posState.setPointsRedeemed).toHaveBeenCalledWith(0)
  })
})
