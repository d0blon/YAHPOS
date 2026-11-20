import { render, screen } from '@testing-library/react'
import DeliveryPromotion from '@/sections/DeliveryPromotion'
import PackSection from '@/sections/PackSection'
import HeroSlide from '@/sections/HeroSlide'

const mockEditor = {
  content: {
    hero: {
      slides: [
        {
          id: 'slide-1',
          badge: 'Abierto',
          titlePrimary: 'PROMO',
          titleAccent: 'DE',
          titleSecondary: 'HOY',
          description: 'Descripción',
          ctaPrimary: 'Ver',
          ctaSecondary: 'Ofertas',
          imageUrl: 'data:image/png;base64,QUJD',
        },
        {
          id: 'slide-2',
          badge: 'Abierto',
          titlePrimary: 'SEGUNDA',
          titleAccent: '',
          titleSecondary: '',
          description: 'Descripción',
          ctaPrimary: 'Ver',
          ctaSecondary: 'Ofertas',
          imageUrl: '',
        },
      ],
    },
  },
  isEditorMode: false,
  uploadImage: jest.fn(),
  updateField: jest.fn(),
  addHeroSlide: jest.fn(),
  removeHeroSlide: jest.fn(),
}

jest.mock('@/providers/EditorProvider', () => ({ useEditor: () => mockEditor }))

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: ReadonlyArray<number> = []
  disconnect = jest.fn()
  observe = jest.fn()
  unobserve = jest.fn()
  takeRecords = jest.fn((): IntersectionObserverEntry[] => [])
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    value: MockIntersectionObserver,
  })
})

describe('sections using next/image', () => {
  it('renders the delivery promotional image', () => {
    render(<DeliveryPromotion />)

    const image = screen.getByAltText('Delivery Service')
    expect(image.tagName).toBe('IMG')
    expect(image.getAttribute('src')).toBe('/delivery_premium_1777248177152.png')
    expect(image).toHaveClass('object-cover')
  })

  it('renders every pack image with its product title as alt', () => {
    render(<PackSection />)

    const image = screen.getByAltText('Pack Super 8')
    expect(image.tagName).toBe('IMG')
    expect(image.getAttribute('src')).toBe('/grocery_packs_premium_1777270721763.png')
    expect(image).toHaveClass('group-hover:scale-110')
    expect(screen.getAllByRole('img')).toHaveLength(3)
  })

  it('renders dynamic hero images unoptimized', () => {
    render(<HeroSlide />)

    const image = screen.getByAltText('PROMO')
    expect(image.tagName).toBe('IMG')
    expect(image.getAttribute('src')).toContain('data:image/png;base64')
  })

  it('keeps a single autoplay timer while slide data is stable', () => {
    const intervalSpy = jest.spyOn(global, 'setInterval')
    const clearSpy = jest.spyOn(global, 'clearInterval')

    const { unmount } = render(<HeroSlide />)

    const autoplayTimers = intervalSpy.mock.calls.filter(([, delay]) => delay === 6000)
    expect(autoplayTimers).toHaveLength(1)

    unmount()
    expect(clearSpy).toHaveBeenCalledWith(intervalSpy.mock.results[intervalSpy.mock.calls.indexOf(autoplayTimers[0])].value)

    intervalSpy.mockRestore()
    clearSpy.mockRestore()
  })
})
