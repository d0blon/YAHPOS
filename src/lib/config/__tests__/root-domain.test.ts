import { getRootOrigin, getRootOriginSafe, ROOT_ORIGIN_ENV_VAR } from '../root-origin'
import {
  getRequestProtocol,
  getRootHost,
  getRootHostSafe,
  getRootRedirectUrl,
  isRootRequestHost,
} from '../root-domain'

const ROOT = 'https://root.example.test'
const ROOT_HOST = new URL(ROOT).host
const originalValue = process.env[ROOT_ORIGIN_ENV_VAR]

type HeadersLike = { get(name: string): string | null }

function headers(values: Record<string, string> = {}): HeadersLike {
  return {
    get(name: string): string | null {
      return values[name.toLowerCase()] ?? null
    },
  }
}

afterEach(() => {
  if (originalValue === undefined) {
    delete process.env[ROOT_ORIGIN_ENV_VAR]
  } else {
    process.env[ROOT_ORIGIN_ENV_VAR] = originalValue
  }
})

describe('root origin', () => {
  it('getRootOrigin devuelve el origin configurado', () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = ROOT
    expect(getRootOrigin()).toBe(ROOT)
  })

  it.each(['not-a-url', 'ftp://root.example.test', `${ROOT}/ruta`])(
    'getRootOrigin falla cerrado con config inválida: %s',
    (value) => {
      process.env[ROOT_ORIGIN_ENV_VAR] = value
      expect(() => getRootOrigin()).toThrow(ROOT_ORIGIN_ENV_VAR)
    }
  )

  it('getRootOrigin falla cerrado si la variable falta', () => {
    delete process.env[ROOT_ORIGIN_ENV_VAR]
    expect(() => getRootOrigin()).toThrow(ROOT_ORIGIN_ENV_VAR)
  })

  it('getRootOriginSafe devuelve el origin válido', () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = ROOT
    expect(getRootOriginSafe()).toBe(ROOT)
  })

  it.each(['not-a-url', `${ROOT}/ruta`, ''])(
    'getRootOriginSafe devuelve null con config inválida: %s',
    (value) => {
      process.env[ROOT_ORIGIN_ENV_VAR] = value
      expect(getRootOriginSafe()).toBeNull()
    }
  )

  it('getRootOriginSafe devuelve null si la variable falta', () => {
    delete process.env[ROOT_ORIGIN_ENV_VAR]
    expect(getRootOriginSafe()).toBeNull()
  })
})

describe('root host', () => {
  beforeEach(() => {
    process.env[ROOT_ORIGIN_ENV_VAR] = ROOT
  })

  it('deriva el host del origin configurado', () => {
    expect(getRootHost()).toBe(ROOT_HOST)
    expect(getRootHostSafe()).toBe(ROOT_HOST)
  })

  it('deriva el host de un origin con puerto sin literales', () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = 'http://root.example.test:3000'
    expect(getRootHost()).toBe('root.example.test:3000')
    expect(getRootHostSafe()).toBe('root.example.test:3000')
  })

  it('getRootHostSafe devuelve null con config rota', () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = 'not-a-url'
    expect(getRootHostSafe()).toBeNull()
    expect(() => getRootHost()).toThrow(ROOT_ORIGIN_ENV_VAR)
  })

  it.each([ROOT_HOST, ROOT_HOST.toUpperCase(), `www.${ROOT_HOST}`, `WWW.${ROOT_HOST.toUpperCase()}`])(
    'reconoce el host raíz: %s',
    (host) => {
      expect(isRootRequestHost(host)).toBe(true)
    }
  )

  it.each(['otro.example.net', `tienda.${ROOT_HOST}`, `${ROOT_HOST}.atacante.test`, ''])(
    'rechaza subdominios y hosts ajenos: %s',
    (host) => {
      expect(isRootRequestHost(host)).toBe(false)
    }
  )

  it('falla cerrado con config rota', () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = 'not-a-url'
    expect(isRootRequestHost(ROOT_HOST)).toBe(false)
  })
})

describe('getRequestProtocol', () => {
  beforeEach(() => {
    process.env[ROOT_ORIGIN_ENV_VAR] = ROOT
  })

  it('acepta x-forwarded-proto: https', () => {
    expect(getRequestProtocol(headers({ 'x-forwarded-proto': 'https' }))).toBe('https')
  })

  it('usa el primer valor de una lista', () => {
    expect(getRequestProtocol(headers({ 'x-forwarded-proto': 'http, https' }))).toBe('http')
    expect(getRequestProtocol(headers({ 'x-forwarded-proto': 'HTTPS, http' }))).toBe('https')
  })

  it('ignora valores inválidos y usa el origin raíz', () => {
    expect(getRequestProtocol(headers({ 'x-forwarded-proto': 'javascript' }))).toBe('https')
  })

  it('sin header usa el protocolo del origin raíz http', () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = 'http://root.example.test:3000'
    expect(getRequestProtocol(headers())).toBe('http')
  })

  it('sin header usa el protocolo del origin raíz https', () => {
    expect(getRequestProtocol(headers())).toBe('https')
  })

  it('falla cerrado a https con config rota', () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = 'not-a-url'
    expect(getRequestProtocol(headers())).toBe('https')
    expect(getRequestProtocol(headers({ 'x-forwarded-proto': 'http' }))).toBe('http')
  })
})

describe('getRootRedirectUrl', () => {
  it('resuelve paths contra el origin configurado', () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = ROOT
    expect(getRootRedirectUrl()).toBe(`${ROOT}/`)
    expect(getRootRedirectUrl('/admin')).toBe(`${ROOT}/admin`)
  })

  it('lanza con config rota para que el caller decida', () => {
    process.env[ROOT_ORIGIN_ENV_VAR] = 'not-a-url'
    expect(() => getRootRedirectUrl()).toThrow(ROOT_ORIGIN_ENV_VAR)
  })
})
