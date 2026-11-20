import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SystemHealth from '../SystemHealth'

type StatusFor = (url: string) => number

const makeResponse = (status: number): Response =>
  ({ ok: status >= 200 && status < 300, status }) as Response

const originalFetch = global.fetch
let statusFor: StatusFor

const fetchMock = jest.fn((input: RequestInfo | URL): Promise<Response> =>
  Promise.resolve(makeResponse(statusFor(String(input))))
)

beforeEach(() => {
  statusFor = () => 200
  fetchMock.mockReset()
  fetchMock.mockImplementation((input: RequestInfo | URL): Promise<Response> =>
    Promise.resolve(makeResponse(statusFor(String(input))))
  )
  global.fetch = fetchMock
})

afterEach(() => {
  global.fetch = originalFetch
  jest.restoreAllMocks()
})

describe('SystemHealth', () => {
  it('200 en los cuatro endpoints => SISTEMA_OK', async () => {
    render(<SystemHealth />)

    expect(await screen.findByText('SISTEMA_OK')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('401 en /api/staff => auth offline con detalle de status', async () => {
    statusFor = url => (url.startsWith('/api/staff') ? 401 : 200)
    render(<SystemHealth />)

    expect(await screen.findByText('CRITICO')).toBeInTheDocument()
    expect(screen.getByText('Error 401')).toBeInTheDocument()
  })

  it('500 en /api/settings => database y storage offline con detalle de status', async () => {
    statusFor = url => (url.startsWith('/api/settings') ? 500 : 200)
    render(<SystemHealth />)

    expect(await screen.findByText('CRITICO')).toBeInTheDocument()
    expect(screen.getAllByText('Error 500')).toHaveLength(2)
  })

  it('latencia mayor a 800ms => DEGRADADO', async () => {
    fetchMock.mockImplementation(
      () => new Promise<Response>(resolve => setTimeout(() => resolve(makeResponse(200)), 900))
    )
    render(<SystemHealth />)

    expect(await screen.findByText('DEGRADADO', undefined, { timeout: 4000 })).toBeInTheDocument()
  })

  it('botón refresh vuelve a consultar los endpoints', async () => {
    render(<SystemHealth />)

    await screen.findByText('SISTEMA_OK')
    expect(fetchMock).toHaveBeenCalledTimes(4)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(8))
  })
})
