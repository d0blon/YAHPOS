import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SalesTrendChart } from '@/components/admin/SalesTrendChart'

const series = {
  buckets: [
    { label: 'Ene', pos: 10, ecom: 5 },
    { label: 'Feb', pos: 20, ecom: 7 },
  ],
  ticks: [
    { at: 0, text: 'Ene', current: true },
    { at: 1, text: 'Feb' },
  ],
  total: 42,
}

class ResizeObserverMock {
  observe = jest.fn()
  unobserve = jest.fn()
  disconnect = jest.fn()
}

describe('SalesTrendChart effects', () => {
  let fetchMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver
    jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(360)
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ({
        setTransform: jest.fn(),
        clearRect: jest.fn(),
        fillRect: jest.fn(),
        beginPath: jest.fn(),
        roundRect: jest.fn(),
        fill: jest.fn(),
        fillStyle: '',
      }) as unknown as CanvasRenderingContext2D
    )
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => series,
    })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('loads once and does not re-run the fetch effect when toggling the series', async () => {
    render(<SalesTrendChart />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(screen.getByText('$42')).toBeInTheDocument()
    })

    await act(async () => {
      await Promise.resolve()
    })

    fireEvent.click(screen.getByRole('button', { name: /^POS$/ }))

    await act(async () => {
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText('$12')).toBeInTheDocument()
  })
})
