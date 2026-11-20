import { render, screen } from '@testing-library/react'
import Footer from '@/components/layout/Footer'
import EcommerceUpgradePage from '@/components/saas/EcommerceUpgradePage'
import { EditorProvider, useEditor } from '@/providers/EditorProvider'
import { useSaaS } from '@/providers/SaaSProvider'

jest.mock('@gsap/react', () => ({ useGSAP: jest.fn() }))
jest.mock('@/lib/gsap', () => ({
  ensureGsapRegistered: jest.fn(),
  toArray: jest.fn(() => []),
}))
jest.mock('@/providers/SaaSProvider', () => ({ useSaaS: jest.fn() }))
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: { from: jest.fn() },
  },
}))

type SaasValue = ReturnType<typeof useSaaS>
type EnvKey = 'NEXT_PUBLIC_SUPPORT_EMAIL' | 'NEXT_PUBLIC_ROOT_ORIGIN' | 'NEXT_PUBLIC_ROOT_DOMAIN'

const ENV_KEYS: readonly EnvKey[] = [
  'NEXT_PUBLIC_SUPPORT_EMAIL',
  'NEXT_PUBLIC_ROOT_ORIGIN',
  'NEXT_PUBLIC_ROOT_DOMAIN',
]

const ENV_INICIAL: Readonly<Record<EnvKey, string | undefined>> = {
  NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  NEXT_PUBLIC_ROOT_ORIGIN: process.env.NEXT_PUBLIC_ROOT_ORIGIN,
  NEXT_PUBLIC_ROOT_DOMAIN: process.env.NEXT_PUBLIC_ROOT_DOMAIN,
}

const LEGACY = /yahpos\.cl|australmarket\.cl/i
const SUPPORT_EMAIL = 'soporte@example.test'
const ROOT_ORIGIN = 'https://root.example.test'
const SUBJECT = 'Quiero activar el Plan Archipiélago'

function setEnv(values: Partial<Record<EnvKey, string>>): void {
  for (const key of ENV_KEYS) {
    const value = values[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

function saasConTier(tier: SaasValue['tier']): SaasValue {
  return {
    config: {
      tier,
      store_name: 'Austral Market',
      store_logo: null,
      tax_id: null,
      white_label_enabled: false,
      accent_color: '#000000',
      appearance_primary_color: '#000000',
      surface_color: null,
    },
    storeId: null,
    isLoading: false,
    isFeatureEnabled: jest.fn(() => false),
    isDocumentTypeEnabled: jest.fn(() => false),
    tier,
    refreshConfig: jest.fn(async () => {}),
  }
}

function expectNoLegacyDomains(container: HTMLElement): void {
  expect(container.textContent ?? '').not.toMatch(LEGACY)
  const hrefs = Array.from(container.querySelectorAll('a')).map((link) => link.getAttribute('href') ?? '')
  expect(hrefs.some((href) => LEGACY.test(href))).toBe(false)
}

function EmailProbe() {
  const editor = useEditor()
  return <span data-testid="editor-email">{editor?.content.footer.contact.email ?? ''}</span>
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = ENV_INICIAL[key]
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

describe('configuración de contacto en componentes', () => {
  it('muestra email y root cuando hay configuración', () => {
    setEnv({
      NEXT_PUBLIC_SUPPORT_EMAIL: SUPPORT_EMAIL,
      NEXT_PUBLIC_ROOT_ORIGIN: ROOT_ORIGIN,
      NEXT_PUBLIC_ROOT_DOMAIN: 'root.example.test',
    })
    const simulado = jest.mocked(useSaaS)

    simulado.mockReturnValue(saasConTier('archipielago'))
    const footerPremium = render(<Footer />)
    expect(screen.getByText(SUPPORT_EMAIL)).toBeInTheDocument()
    expectNoLegacyDomains(footerPremium.container)
    footerPremium.unmount()

    simulado.mockReturnValue(saasConTier('austral'))
    const footerAustral = render(<Footer />)
    expect(screen.getByRole('link', { name: /Ver Planes/i })).toHaveAttribute('href', ROOT_ORIGIN)
    footerAustral.unmount()

    const upgrade = render(<EcommerceUpgradePage />)
    expect(screen.getByRole('link', { name: /Activar Plan Archipiélago/i })).toHaveAttribute(
      'href',
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUBJECT)}`,
    )
    expect(screen.getByText(/root\.example\.test/)).toBeInTheDocument()
    upgrade.unmount()

    const editor = render(
      <EditorProvider>
        <EmailProbe />
      </EditorProvider>,
    )
    expect(screen.getByTestId('editor-email')).toHaveTextContent(SUPPORT_EMAIL)
    editor.unmount()
  })

  it('sin configuración oculta enlaces y texto con dominio legacy', () => {
    setEnv({})
    const simulado = jest.mocked(useSaaS)

    simulado.mockReturnValue(saasConTier('austral'))
    const footerAustral = render(<Footer />)
    expectNoLegacyDomains(footerAustral.container)
    expect(screen.queryByRole('link', { name: /Ver Planes/i })).not.toBeInTheDocument()
    footerAustral.unmount()

    simulado.mockReturnValue(saasConTier('archipielago'))
    const footerPremium = render(<Footer />)
    expectNoLegacyDomains(footerPremium.container)
    footerPremium.unmount()

    const upgrade = render(<EcommerceUpgradePage />)
    expectNoLegacyDomains(upgrade.container)
    expect(screen.queryByRole('link', { name: /Activar Plan Archipiélago/i })).not.toBeInTheDocument()
    upgrade.unmount()

    const editor = render(
      <EditorProvider>
        <EmailProbe />
      </EditorProvider>,
    )
    expectNoLegacyDomains(editor.container)
    expect(screen.getByTestId('editor-email').textContent).toBe('')
    editor.unmount()
  })
})
