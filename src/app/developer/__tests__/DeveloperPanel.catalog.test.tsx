import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import DeveloperPanel from '../DeveloperPanel'
import {
  getPendingMasterCatalogSubmissionsAction,
  getApprovedMasterCatalogProductsAction,
} from '../actions/catalog'
import { getStoresWithStatusAction } from '../actions/stores'
import { getFinancialStatsAction } from '../actions/financial'

jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: null }),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

jest.mock('../actions/stores', () => ({
  getStoresWithStatusAction: jest.fn(),
  createStoreAction: jest.fn(),
  updateStoreDomainsAction: jest.fn(),
  verifyDnsAction: jest.fn(),
}))

jest.mock('../actions/financial', () => ({
  updateStoreBillingAction: jest.fn(),
  recordAdminExpenseAction: jest.fn(),
  getFinancialStatsAction: jest.fn(),
}))

jest.mock('../actions/auth', () => ({
  logoutDeveloperAction: jest.fn(),
}))

jest.mock('../actions/catalog', () => ({
  getPendingMasterCatalogSubmissionsAction: jest.fn(),
  approveMasterCatalogSubmissionAction: jest.fn(),
  rejectMasterCatalogSubmissionAction: jest.fn(),
  importEnrichedMasterCatalogSubmissionsAction: jest.fn(),
  getApprovedMasterCatalogProductsAction: jest.fn(),
}))

const pendingMock = jest.mocked(getPendingMasterCatalogSubmissionsAction)
const approvedMock = jest.mocked(getApprovedMasterCatalogProductsAction)
const storesMock = jest.mocked(getStoresWithStatusAction)
const financialMock = jest.mocked(getFinancialStatsAction)

beforeEach(() => {
  jest.clearAllMocks()
  pendingMock.mockResolvedValue({ success: true, data: [] })
  approvedMock.mockResolvedValue({ success: true, data: [], total: 0, page: 0, pageSize: 50 })
  storesMock.mockResolvedValue([])
  financialMock.mockResolvedValue({ income: 0, expense: 0, profit: 0, monthlyData: [], simulated: true })
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('DeveloperPanel catálogo maestro', () => {
  it('cambio de catalogSearch dispara la búsqueda correcta sin loop ni refetch duplicado', async () => {
    render(<DeveloperPanel />)

    fireEvent.click(screen.getByText('Catálogo Maestro'))
    await waitFor(() => expect(pendingMock).toHaveBeenCalledTimes(1))

    fireEvent.click(screen.getByText('Catálogo Aprobado'))
    await waitFor(() => expect(approvedMock).toHaveBeenCalledTimes(1))
    expect(approvedMock).toHaveBeenLastCalledWith('', 0)

    fireEvent.change(screen.getByPlaceholderText('Buscar en catálogo...'), {
      target: { value: 'laptop' },
    })

    await waitFor(() => expect(approvedMock).toHaveBeenCalledTimes(2))
    expect(approvedMock).toHaveBeenLastCalledWith('laptop', 0)
    expect(screen.queryByText('Cargando catálogo aprobado...')).not.toBeInTheDocument()

    expect(pendingMock).toHaveBeenCalledTimes(1)
    expect(approvedMock).toHaveBeenCalledTimes(2)
  })
})
