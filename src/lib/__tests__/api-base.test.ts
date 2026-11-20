/**
 * @jest-environment node
 */

import { ROOT_ORIGIN_ENV_VAR } from '@/lib/config/root-origin'

const ROOT_ORIGIN = 'https://root.example.test'
const originalRootOrigin = process.env[ROOT_ORIGIN_ENV_VAR]

function setWindowPresent(present: boolean): void {
  if (present) {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {},
    })
    return
  }
  Reflect.deleteProperty(globalThis, 'window')
}

async function loadApi() {
  const modulo = await import('../api')
  return { API_BASE_URL: modulo.API_BASE_URL, apiFetch: modulo.apiFetch }
}

beforeEach(() => {
  delete process.env[ROOT_ORIGIN_ENV_VAR]
  setWindowPresent(false)
  jest.resetModules()
  jest.restoreAllMocks()
})

afterAll(() => {
  if (originalRootOrigin === undefined) {
    delete process.env[ROOT_ORIGIN_ENV_VAR]
  } else {
    process.env[ROOT_ORIGIN_ENV_VAR] = originalRootOrigin
  }
  setWindowPresent(false)
  jest.restoreAllMocks()
})

describe('API_BASE_URL', () => {
  it('en browser usa URL relativa aunque haya root origin configurado', async () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = ROOT_ORIGIN
    setWindowPresent(true)

    const { API_BASE_URL } = await loadApi()

    expect(API_BASE_URL).toBe('/api')
  })

  it('en SSR usa el root origin configurado', async () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = ROOT_ORIGIN

    const { API_BASE_URL } = await loadApi()

    expect(API_BASE_URL).toBe(`${ROOT_ORIGIN}/api`)
  })

  it('en SSR sin configuración usa URL relativa sin lanzar durante el import', async () => {
    // Fail-closed implícito: la llamada real fallaría, pero el módulo carga
    // y `next build` no se rompe con .env.local sin la variable.
    const { API_BASE_URL } = await loadApi()

    expect(API_BASE_URL).toBe('/api')
  })

  it('en SSR con root origin inválido usa URL relativa sin lanzar', async () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = ROOT_ORIGIN.replace('https:', 'ftp:')

    const { API_BASE_URL } = await loadApi()

    expect(API_BASE_URL).toBe('/api')
  })
})

describe('apiFetch', () => {
  it('en SSR llama al root origin + /api + path', async () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = ROOT_ORIGIN
    const { apiFetch } = await loadApi()
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    await expect(apiFetch('/health')).resolves.toBeNull()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(`${ROOT_ORIGIN}/api/health`)
  })

  it('en browser llama a la URL relativa /api + path', async () => {
    setWindowPresent(true)
    const { apiFetch } = await loadApi()
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    await expect(apiFetch('/health')).resolves.toBeNull()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/health')
  })
})
