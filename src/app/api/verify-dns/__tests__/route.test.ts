/** @jest-environment node */

import dns from 'dns/promises'
import { GET } from '@/app/api/verify-dns/route'

jest.mock('dns/promises', () => ({
  __esModule: true,
  default: {
    resolveCname: jest.fn(),
  },
}))

interface ResponseBody {
  valid: boolean
  error?: string
  records?: string[]
  target?: string
}

type ResolveCname = (hostname: string) => Promise<string[]>

const resolveCnameMock = dns.resolveCname as jest.MockedFunction<ResolveCname>
const ROOT_DOMAIN_ENV = 'NEXT_PUBLIC_ROOT_DOMAIN'
const TARGET_HOST = 'proxy.example.test'
const DOMAIN = 'tienda.example.test'
const originalRootDomain = process.env[ROOT_DOMAIN_ENV]

function request(): Request {
  return new Request(`https://localhost/api/verify-dns?domain=${encodeURIComponent(DOMAIN)}`)
}

async function bodyOf(response: Response): Promise<ResponseBody> {
  return (await response.json()) as ResponseBody
}

beforeEach(() => {
  resolveCnameMock.mockReset()
  process.env[ROOT_DOMAIN_ENV] = TARGET_HOST
})

afterAll(() => {
  if (originalRootDomain === undefined) {
    delete process.env[ROOT_DOMAIN_ENV]
  } else {
    process.env[ROOT_DOMAIN_ENV] = originalRootDomain
  }
})

describe('GET /api/verify-dns', () => {
  it('devuelve valid=true cuando el CNAME apunta al dominio configurado', async () => {
    const records = ['cdn.example.net.', `${TARGET_HOST}.`]
    resolveCnameMock.mockResolvedValue(records)

    const response = await GET(request())
    const body = await bodyOf(response)

    expect(response.status).toBe(200)
    expect(body).toEqual({ valid: true, records, target: TARGET_HOST })
    expect(resolveCnameMock).toHaveBeenCalledWith(DOMAIN)
  })

  it('devuelve valid=false cuando el CNAME apunta a otro destino', async () => {
    const records = ['other.example.net.']
    resolveCnameMock.mockResolvedValue(records)

    const response = await GET(request())
    const body = await bodyOf(response)

    expect(response.status).toBe(200)
    expect(body.valid).toBe(false)
    expect(body.records).toEqual(records)
    expect(body.target).toBe(TARGET_HOST)
  })

  it('responde 500 con el error real del lookup sin exponer stack', async () => {
    const dnsMessage = `queryA ENOTFOUND ${DOMAIN}`
    resolveCnameMock.mockRejectedValue(new Error(dnsMessage))

    const response = await GET(request())
    const body = await bodyOf(response)

    expect(response.status).toBe(500)
    expect(body.valid).toBe(false)
    expect(body.error).toBe(dnsMessage)
    expect(body.target).toBe(TARGET_HOST)
    expect(body).not.toHaveProperty('stack')
  })

  it('falla cerrado si falta NEXT_PUBLIC_ROOT_DOMAIN sin consultar DNS', async () => {
    delete process.env[ROOT_DOMAIN_ENV]

    const response = await GET(request())
    const body = await bodyOf(response)

    expect(response.status).toBe(500)
    expect(body.valid).toBe(false)
    expect(body.error).toContain(ROOT_DOMAIN_ENV)
    expect(resolveCnameMock).not.toHaveBeenCalled()
  })
})
