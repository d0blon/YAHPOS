/**
 * @jest-environment node
 */

type OpcionesCliente = { auth: { persistSession: boolean } }
type LlamadaCliente = [string, string, OpcionesCliente?]

const clienteBasico = { tipo: 'basico' as const }
const clienteSSR = { tipo: 'ssr' as const }
const clienteBrowser = { tipo: 'browser' as const }
const llamadasBasicas: LlamadaCliente[] = []

const mockCreateSupabaseClient = jest.fn((...args: LlamadaCliente) => {
  llamadasBasicas.push(args)
  return clienteBasico
})
const mockCreateSSRClient = jest.fn(() => clienteSSR)
const mockCreateBrowserClient = jest.fn(() => clienteBrowser)
const mockCookies = jest.fn(() => {
  throw new Error('cookies() fuera de request scope')
})

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: LlamadaCliente) => mockCreateSupabaseClient(...args),
}))
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: () => mockCreateBrowserClient(),
  createServerClient: () => mockCreateSSRClient(),
}))
jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}))

describe('createClient — fallback cuando cookies() falla', () => {
  it('devuelve el cliente básico con persistencia desactivada', async () => {
    const { createClient } = await import('../supabase')

    const cliente = await createClient()

    expect(cliente).toBe(clienteBasico)
    expect(mockCookies).toHaveBeenCalledTimes(1)
    expect(mockCreateSSRClient).not.toHaveBeenCalled()
    expect(llamadasBasicas).toHaveLength(2)
    expect(llamadasBasicas[llamadasBasicas.length - 1]).toEqual([
      'https://example.supabase.co',
      'test-anon-key',
      { auth: { persistSession: false } },
    ])
  })
})
