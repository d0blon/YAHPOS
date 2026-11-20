import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createClient } from '@/lib/supabase'
import { getRootOrigin } from '@/lib/config/root-origin'
import { verifyDeveloperRole } from '../actions/_shared'
import { revalidatePath } from 'next/cache'
import DeveloperPanel from '../DeveloperPanel'
import { getStoresWithStatusAction } from '../actions/stores'
import { getFinancialStatsAction } from '../actions/financial'
import type { Store } from '@/types'

jest.mock('@/lib/config/root-origin', () => ({ getRootOrigin: jest.fn() }))
jest.mock('@/lib/supabase', () => ({ createClient: jest.fn(), createAdminClient: jest.fn() }))
jest.mock('../actions/_shared', () => ({ verifyDeveloperRole: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/constants', () => ({ DEVELOPER_EMAILS: [] }))

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

jest.mock('../actions/auth', () => ({ logoutDeveloperAction: jest.fn() }))

jest.mock('../actions/catalog', () => ({
  getPendingMasterCatalogSubmissionsAction: jest.fn(),
  approveMasterCatalogSubmissionAction: jest.fn(),
  rejectMasterCatalogSubmissionAction: jest.fn(),
  importEnrichedMasterCatalogSubmissionsAction: jest.fn(),
  getApprovedMasterCatalogProductsAction: jest.fn(),
}))

jest.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: null }) }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const createClientMock = jest.mocked(createClient)
const getRootOriginMock = jest.mocked(getRootOrigin)
const verifyDeveloperRoleMock = jest.mocked(verifyDeveloperRole)
const revalidatePathMock = jest.mocked(revalidatePath)
const storesMock = jest.mocked(getStoresWithStatusAction)
const financialMock = jest.mocked(getFinancialStatsAction)

const ROOT_ORIGIN_ENV = 'NEXT_PUBLIC_ROOT_ORIGIN'
const ROOT_DOMAIN_ENV = 'NEXT_PUBLIC_ROOT_DOMAIN'
const ROOT_ORIGIN = 'https://root.example.test'
const ROOT_DOMAIN = 'proxy.example.test'
const STORE_ID = 'store-1'
const FAILURE_ERROR = 'La verificación falló. Asegúrate de configurar el CNAME correctamente.'

const originalOrigin = process.env[ROOT_ORIGIN_ENV]
const originalRootDomain = process.env[ROOT_DOMAIN_ENV]
const originalFetch = global.fetch

interface UpdateQuery {
  update: jest.Mock
  eq: jest.Mock
}

function makeUpdateQuery(): UpdateQuery {
  const eq = jest.fn().mockResolvedValue({ data: null, error: null })
  const update = jest.fn(() => ({ eq }))
  return { update, eq }
}

function fakeResponse(body: unknown, ok = true): { response: Response, json: jest.Mock } {
  const json = jest.fn().mockResolvedValue(body)
  return { response: { ok, json } as unknown as Response, json }
}

const storeFixture: Store = {
  id: STORE_ID,
  name: 'Tienda Prueba',
  slug: 'tienda-prueba',
  tier: 'austral',
  payment_status: 'paid',
  next_payment_date: null,
  is_active: true,
  custom_domain: 'www.tienda.example.test',
}

async function openDomainModal(): Promise<void> {
  render(createElement(DeveloperPanel))
  fireEvent.click(screen.getByText('Gestión de Tiendas'))
  await waitFor(() => expect(storesMock).toHaveBeenCalled())
  fireEvent.click(await screen.findByTitle('Gestionar Dominios'))
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn() as unknown as typeof fetch
  getRootOriginMock.mockReturnValue(ROOT_ORIGIN)
  verifyDeveloperRoleMock.mockResolvedValue(undefined)
  storesMock.mockResolvedValue([storeFixture])
  financialMock.mockResolvedValue({ income: 0, expense: 0, profit: 0, monthlyData: [], simulated: true })
  process.env[ROOT_ORIGIN_ENV] = ROOT_ORIGIN
  process.env[ROOT_DOMAIN_ENV] = ROOT_DOMAIN
})

afterAll(() => {
  if (originalOrigin === undefined) delete process.env[ROOT_ORIGIN_ENV]
  else process.env[ROOT_ORIGIN_ENV] = originalOrigin

  if (originalRootDomain === undefined) delete process.env[ROOT_DOMAIN_ENV]
  else process.env[ROOT_DOMAIN_ENV] = originalRootDomain

  global.fetch = originalFetch
})

describe('verifyDnsAction', () => {
  const { verifyDnsAction } = jest.requireActual<typeof import('../actions/stores')>('../actions/stores')
  let updateQuery: UpdateQuery
  let fetchMock: jest.Mock

  beforeEach(() => {
    updateQuery = makeUpdateQuery()
    const supabaseClient = { from: jest.fn(() => updateQuery) } as unknown as Awaited<ReturnType<typeof createClient>>
    createClientMock.mockResolvedValue(supabaseClient)
    fetchMock = global.fetch as unknown as jest.Mock
  })

  it('usa el root origin configurado, marca domain_verified y revalida con valid=true', async () => {
    const { response } = fakeResponse({ valid: true })
    fetchMock.mockResolvedValue(response)

    const result = await verifyDnsAction(STORE_ID, 'www.tienda.example.test')

    expect(getRootOriginMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `${ROOT_ORIGIN}/api/verify-dns?domain=www.tienda.example.test`
    )
    expect(verifyDeveloperRoleMock).toHaveBeenCalledWith(
      await createClientMock.mock.results[0].value
    )
    expect(updateQuery.update).toHaveBeenCalledWith({ domain_verified: true })
    expect(updateQuery.eq).toHaveBeenCalledWith('id', STORE_ID)
    expect(revalidatePathMock).toHaveBeenCalledWith('/developer')
    expect(result).toEqual({ success: true, message: 'DNS Verificado correctamente' })
  })

  it('codifica caracteres especiales del dominio en la query', async () => {
    const { response } = fakeResponse({ valid: true })
    fetchMock.mockResolvedValue(response)

    await verifyDnsAction(STORE_ID, 'tienda & co.example.test')

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `${ROOT_ORIGIN}/api/verify-dns?domain=tienda+%26+co.example.test`
    )
  })

  it('no actualiza ni revalida cuando valid=false', async () => {
    const { response } = fakeResponse({ valid: false })
    fetchMock.mockResolvedValue(response)

    const result = await verifyDnsAction(STORE_ID, 'www.tienda.example.test')

    expect(result).toEqual({ success: false, error: FAILURE_ERROR })
    expect(updateQuery.update).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('falla antes de parsear el body cuando response.ok es false', async () => {
    const { response, json } = fakeResponse({ valid: true }, false)
    fetchMock.mockResolvedValue(response)

    const result = await verifyDnsAction(STORE_ID, 'www.tienda.example.test')

    expect(result).toEqual({ success: false, error: FAILURE_ERROR })
    expect(json).not.toHaveBeenCalled()
    expect(updateQuery.update).not.toHaveBeenCalled()
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('falla cerrado sin fetch si falta la configuración del origen raíz', async () => {
    getRootOriginMock.mockImplementation(() => {
      throw new Error('config faltante')
    })

    const result = await verifyDnsAction(STORE_ID, 'www.tienda.example.test')

    expect(result).toEqual({ success: false, error: 'NEXT_PUBLIC_ROOT_ORIGIN no está configurado' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(createClientMock).not.toHaveBeenCalled()
    expect(updateQuery.update).not.toHaveBeenCalled()
  })
})

describe('DeveloperPanel dominios derivados de configuración', () => {
  it('muestra el sufijo y el target DNS desde el entorno', async () => {
    await openDomainModal()

    expect(screen.getByText('.root.example.test')).toBeInTheDocument()
    expect(screen.getByText(`CNAME @ → ${ROOT_DOMAIN}`)).toBeInTheDocument()
  })

  it('muestra mensaje neutral y fail-closed sin configuración', async () => {
    delete process.env[ROOT_ORIGIN_ENV]
    delete process.env[ROOT_DOMAIN_ENV]
    getRootOriginMock.mockImplementation(() => {
      throw new Error('config faltante')
    })

    await openDomainModal()

    expect(screen.getByText('<dominio raíz sin configurar>')).toBeInTheDocument()
    expect(screen.getByText(/Configura NEXT_PUBLIC_ROOT_ORIGIN o NEXT_PUBLIC_ROOT_DOMAIN/)).toBeInTheDocument()
    expect(screen.queryByText(/CNAME @ →/)).not.toBeInTheDocument()
  })
})
