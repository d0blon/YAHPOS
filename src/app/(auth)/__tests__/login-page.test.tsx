import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { useRouter, useSearchParams } from 'next/navigation'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { useTheme } from '@/providers/ThemeProvider'
import { useSaaS } from '@/providers/SaaSProvider'
import { useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase'
import { getRootOrigin } from '@/lib/config/root-origin'
import LoginPage, { loginNavigation } from '@/app/(auth)/login/page'
import { GET } from '@/app/api/auth/sso/route'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: { redirect: jest.fn() },
}))
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))
jest.mock('@/providers/ThemeProvider', () => ({ useTheme: jest.fn() }))
jest.mock('@/providers/SaaSProvider', () => ({ useSaaS: jest.fn() }))
jest.mock('@/stores', () => {
  const hook = jest.fn()
  return { useAuthStore: Object.assign(hook, { getState: jest.fn() }) }
})
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn(), getUser: jest.fn() },
    from: jest.fn(),
  },
  createClient: jest.fn(),
}))
jest.mock('@/lib/config/root-origin', () => ({ getRootOrigin: jest.fn() }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mockUseRouter = jest.mocked(useRouter)
const mockUseSearchParams = jest.mocked(useSearchParams)
const mockRedirect = jest.mocked(NextResponse.redirect)
const mockCreateServerClient = jest.mocked(createServerClient)
const mockUseTheme = jest.mocked(useTheme)
const mockUseSaaS = jest.mocked(useSaaS)
const mockUseAuthStore = jest.mocked(useAuthStore)
const mockGetState = jest.mocked(useAuthStore.getState)
const mockGetSession = jest.mocked(supabase.auth.getSession)
const mockGetUser = jest.mocked(supabase.auth.getUser)
const mockFrom = jest.mocked(supabase.from)
const mockGetRootOrigin = jest.mocked(getRootOrigin)
const mockPush = jest.fn()

const TEST_ROOT_ORIGIN = 'https://root.example.test'
const TEST_CURRENT_ORIGIN = 'http://localhost'
const TEST_SSO_FROM_ORIGIN = 'https://tienda.root.example.test'

type SetAll = (
  cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>,
  headers: Record<string, string>
) => void
type OAuthCall = { options: { redirectTo: string } }

function searchParamsFor(values: Record<string, string>) {
  return new URLSearchParams(values) as unknown as ReturnType<typeof useSearchParams>
}

function mockAuthenticatedSession(role: string) {
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'token' } },
    error: null,
  } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>)
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-id' } },
    error: null,
  } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>)

  const single = jest.fn().mockResolvedValue({ data: { role } })
  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  mockFrom.mockReturnValue({ select } as unknown as ReturnType<typeof supabase.from>)
}

function createSsoRequest(): NextRequest {
  return {
    url: `${TEST_ROOT_ORIGIN}/api/auth/sso?from_origin=${encodeURIComponent(TEST_SSO_FROM_ORIGIN)}&next=%2Fadmin`,
    headers: { get: () => 'root.example.test' },
    cookies: { getAll: () => [], set: jest.fn() },
  } as unknown as NextRequest
}

beforeEach(() => {
  jest.resetAllMocks()

  mockUseRouter.mockReturnValue({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  } as unknown as ReturnType<typeof useRouter>)
  mockUseSearchParams.mockReturnValue(searchParamsFor({}))
  mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: () => undefined })
  mockUseSaaS.mockReturnValue({} as unknown as ReturnType<typeof useSaaS>)
  mockUseAuthStore.mockReturnValue({
    login: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
  } as unknown as ReturnType<typeof useAuthStore>)
  mockGetState.mockReturnValue({ user: null } as unknown as ReturnType<typeof useAuthStore.getState>)
  mockGetSession.mockResolvedValue({
    data: { session: null },
    error: null,
  } as unknown as Awaited<ReturnType<typeof supabase.auth.getSession>>)
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: null,
  } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>)
  mockGetRootOrigin.mockReturnValue(TEST_ROOT_ORIGIN)
  mockRedirect.mockImplementation((url) => ({
    url: url.toString(),
    cookies: { set: jest.fn() },
  } as unknown as NextResponse))
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('LoginPage', () => {
  it('mantiene placeholder durante la hidratación', () => {
    const markup = renderToStaticMarkup(<LoginPage />)

    expect(markup).toContain('animate-pulse')
    expect(markup).not.toContain('<img')
  })

  it('auto-redirige admin autenticado a /admin con URL absoluta', async () => {
    const goSpy = jest.spyOn(loginNavigation, 'go').mockImplementation(() => undefined)
    mockAuthenticatedSession('admin')

    render(<LoginPage />)

    await waitFor(() => expect(goSpy).toHaveBeenCalledWith(`${TEST_CURRENT_ORIGIN}/admin`))
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('auto-redirige customer autenticado a la raíz con URL absoluta', async () => {
    const goSpy = jest.spyOn(loginNavigation, 'go').mockImplementation(() => undefined)
    mockAuthenticatedSession('customer')

    render(<LoginPage />)

    await waitFor(() => expect(goSpy).toHaveBeenCalledWith(`${TEST_CURRENT_ORIGIN}/`))
  })

  it('bloquea redirect inválido y usa la raíz del sitio actual', async () => {
    const goSpy = jest.spyOn(loginNavigation, 'go').mockImplementation(() => undefined)
    mockUseSearchParams.mockReturnValue(searchParamsFor({ redirect: '//evil.example.test' }))
    mockAuthenticatedSession('customer')

    render(<LoginPage />)

    await waitFor(() => expect(goSpy).toHaveBeenCalledWith(`${TEST_CURRENT_ORIGIN}/`))
  })

  it('conserva navegación completa en login con contraseña', async () => {
    const goSpy = jest.spyOn(loginNavigation, 'go').mockImplementation(() => undefined)
    mockGetState.mockReturnValue({
      user: { role: 'admin' },
    } as unknown as ReturnType<typeof useAuthStore.getState>)

    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'user@example.test' },
    })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }))

    await waitFor(() => expect(goSpy).toHaveBeenCalledWith(`${TEST_CURRENT_ORIGIN}/admin`))
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('Google SSO usa el root origin del env sin dominio literal', async () => {
    const goSpy = jest.spyOn(loginNavigation, 'go').mockImplementation(() => undefined)
    mockUseSearchParams.mockReturnValue(searchParamsFor({ next: '/admin' }))

    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /continuar con google/i }))

    await waitFor(() => expect(goSpy).toHaveBeenCalled())
    const destination = goSpy.mock.calls[0][0]

    const ssoUrl = new URL(destination)
    expect(ssoUrl.origin).toBe(TEST_ROOT_ORIGIN)
    expect(ssoUrl.pathname).toBe('/api/auth/sso')
    expect(ssoUrl.searchParams.get('from_origin')).toBe(TEST_CURRENT_ORIGIN)
    expect(ssoUrl.searchParams.get('next')).toBe('/admin')
    expect(mockGetRootOrigin).toHaveBeenCalled()
  })

  it('Google SSO no propaga next externo', async () => {
    const goSpy = jest.spyOn(loginNavigation, 'go').mockImplementation(() => undefined)
    mockUseSearchParams.mockReturnValue(searchParamsFor({ next: '//evil.example.test' }))

    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: /continuar con google/i }))

    await waitFor(() => expect(goSpy).toHaveBeenCalled())
    const ssoUrl = new URL(goSpy.mock.calls[0][0])

    expect(ssoUrl.searchParams.has('next')).toBe(false)
    expect(ssoUrl.origin).toBe(TEST_ROOT_ORIGIN)
  })
})

describe('SSO route', () => {
  it('apunta callback al root origin del env y conserva cookies', async () => {
    let capturedSetAll: SetAll | undefined
    let capturedRedirectTo: string | undefined
    const signInWithOAuth = jest.fn(async (call: OAuthCall) => {
      capturedRedirectTo = call.options.redirectTo
      capturedSetAll?.(
        [{ name: 'sb-auth', value: 'token', options: { maxAge: 60 } }],
        {}
      )
      return { data: { url: 'https://accounts.example.test/oauth' }, error: null }
    })

    mockCreateServerClient.mockImplementation((...args) => {
      const options = args[2] as { cookies: { setAll?: SetAll } }
      capturedSetAll = options.cookies.setAll
      return { auth: { signInWithOAuth } } as unknown as ReturnType<typeof createServerClient>
    })

    const response = await GET(createSsoRequest())
    if (!capturedRedirectTo) throw new Error('redirectTo no capturado')
    const callbackUrl = new URL(capturedRedirectTo)

    expect(callbackUrl.origin).toBe(TEST_ROOT_ORIGIN)
    expect(callbackUrl.pathname).toBe('/api/auth/callback')
    expect(callbackUrl.searchParams.get('next')).toBe('/admin')
    expect(callbackUrl.searchParams.get('from_origin')).toBe(TEST_SSO_FROM_ORIGIN)
    expect(response.cookies.set).toHaveBeenCalledWith(
      'sb-auth',
      'token',
      expect.objectContaining({ secure: true, sameSite: 'lax', path: '/' })
    )
  })

  it('conserva redirect de error sso_failed', async () => {
    mockCreateServerClient.mockImplementation(
      () =>
        ({
          auth: {
            signInWithOAuth: jest.fn(async () => ({
              data: { url: '' },
              error: new Error('oauth falló'),
            })),
          },
        }) as unknown as ReturnType<typeof createServerClient>
    )

    await GET(createSsoRequest())

    expect(mockRedirect).toHaveBeenCalledWith(`${TEST_SSO_FROM_ORIGIN}/login?error=sso_failed`)
  })

  it('falla cerrado y conserva redirect de error sso_error si falta el env', async () => {
    mockGetRootOrigin.mockImplementation(() => {
      throw new Error('env faltante')
    })

    await GET(createSsoRequest())

    expect(mockCreateServerClient).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith(`${TEST_ROOT_ORIGIN}/login?error=sso_error`)
  })
})
