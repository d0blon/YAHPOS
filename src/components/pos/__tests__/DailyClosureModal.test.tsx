import { render, screen } from '@testing-library/react'
import { DailyClosureModal } from '@/components/pos/DailyClosureModal'
import { formatPrice } from '@/lib/utils'
import type { OrderRecord, PosSettings } from '@/stores/posStore'

const mockSettings: PosSettings = {
  blindClosureEnabled: false,
  pinRequiredForDelete: false,
  supervisorPin: '',
  loyaltyEnabled: false,
  siiEmission: 'always',
}

jest.mock('@/stores/posStore', () => ({
  usePosStore: () => ({
    clearSalesHistory: jest.fn(),
    settings: mockSettings,
    cashSession: null,
    clearCashSession: jest.fn(),
    cashMovements: [],
    clearCashMovements: jest.fn(),
  }),
}))

const sales: OrderRecord[] = [{
  id: 'sale-1',
  items: [],
  subtotal: 11900,
  total: 11900,
  pointsToEarn: 0,
  paymentMethod: 'EFECTIVO',
  timestamp: 1,
  isOffline: false,
}]

describe('DailyClosureModal tax summary', () => {
  it('shows neto and IVA derived from gross sales without changing totals', () => {
    render(<DailyClosureModal isOpen onClose={jest.fn()} sales={sales} />)

    expect(screen.getByText('Ventas Totales')).toBeInTheDocument()
    expect(screen.getAllByText(formatPrice(11900))).toHaveLength(3)
    expect(screen.getByText('Neto (sin IVA)')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(10000))).toBeInTheDocument()
    expect(screen.getByText('IVA (19%)')).toBeInTheDocument()
    expect(screen.getByText(formatPrice(1900))).toBeInTheDocument()
    expect(screen.getByText('Efectivo Esperado')).toBeInTheDocument()
    expect(screen.getAllByText(formatPrice(11900))).toHaveLength(3)
  })
})
