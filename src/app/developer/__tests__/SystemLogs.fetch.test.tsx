import { act, render, waitFor } from '@testing-library/react'
import SystemLogs from '../SystemLogs'
import { getRealLogsAction } from '../actions/logs'

jest.mock('../actions/logs', () => ({
  getRealLogsAction: jest.fn(),
}))

const logsMock = jest.mocked(getRealLogsAction)

beforeEach(() => {
  jest.clearAllMocks()
  logsMock.mockResolvedValue([])
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('SystemLogs fetch estable', () => {
  it('consulta una vez por montaje/cambio de storeId y no por identidad de callback', async () => {
    const { rerender } = render(<SystemLogs />)

    await waitFor(() => expect(logsMock).toHaveBeenCalledTimes(1))
    expect(logsMock).toHaveBeenLastCalledWith(undefined)

    rerender(<SystemLogs />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(logsMock).toHaveBeenCalledTimes(1)

    rerender(<SystemLogs storeId="store-1" />)
    await waitFor(() => expect(logsMock).toHaveBeenCalledTimes(2))
    expect(logsMock).toHaveBeenLastCalledWith('store-1')
  })

  it('instala un único intervalo de polling por efecto', async () => {
    const intervalSpy = jest.spyOn(global, 'setInterval')

    render(<SystemLogs storeId="ALL" />)

    await waitFor(() => expect(logsMock).toHaveBeenCalledTimes(1))
    const pollingCalls = intervalSpy.mock.calls.filter(call => call[1] === 15000)
    expect(pollingCalls).toHaveLength(1)
  })
})
