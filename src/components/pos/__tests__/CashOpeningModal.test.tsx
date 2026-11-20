import { act, render, screen, waitFor } from '@testing-library/react'
import { CashOpeningModal } from '@/components/pos/CashOpeningModal'
import type { CashSession } from '@/stores/posStore'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}))

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: { user: null }) => unknown) => selector({ user: null }),
}))

const loadDraftFromServer = jest.fn().mockResolvedValue(undefined)

jest.mock('@/stores/posStore', () => ({
  usePosStore: { getState: () => ({ loadDraftFromServer }) },
}))

const session: CashSession = {
  id: 42,
  terminal_id: 1,
  terminal_name: 'Caja 1',
  cashier_name: 'Cajero',
  opening_amount: 10000,
  opened_at: '2026-11-20T10:00:00.000Z',
  status: 'open',
}

const fetchMock = jest.fn((input: RequestInfo | URL) => {
  const url = String(input)
  const responseBody: unknown = url === '/api/cash-sessions'
    ? { tableExists: true, session: null }
    : []
  return Promise.resolve({ json: () => Promise.resolve(responseBody) } as Response)
})

describe('CashOpeningModal session check', () => {
  const onSessionOpened = jest.fn()
  const onResumeSession = jest.fn()

  beforeEach(() => {
    fetchMock.mockClear()
    onSessionOpened.mockClear()
    onResumeSession.mockClear()
    loadDraftFromServer.mockClear()
    global.fetch = fetchMock as typeof fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('runs the session check once for stable props', async () => {
    const props = { isOpen: true, cashierName: 'Cajero', onSessionOpened, onResumeSession }
    const { rerender } = render(<CashOpeningModal {...props} />)

    expect(await screen.findByText('Estación de Trabajo')).toBeInTheDocument()

    rerender(<CashOpeningModal {...props} />)
    await act(async () => {
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === '/api/cash-sessions')).toHaveLength(1)
  })

  it('auto-resumes an existing session without loading terminals', async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const responseBody: unknown = String(input) === '/api/cash-sessions'
        ? { tableExists: true, session }
        : []
      return Promise.resolve({ json: () => Promise.resolve(responseBody) } as Response)
    })

    render(
      <CashOpeningModal isOpen cashierName="Cajero" onSessionOpened={onSessionOpened} onResumeSession={onResumeSession} />,
    )

    await waitFor(() => expect(onResumeSession).toHaveBeenCalledWith(session))
    expect(loadDraftFromServer).toHaveBeenCalledWith(session.id)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
