import { fireEvent, render, screen } from '@testing-library/react'
import CatalogViewer from '../catalog/CatalogViewer'

interface CatalogProduct {
  name: string
  sku: string
  brand: string
  price: number
  category_main: string
  images: string[]
}

const catalog: CatalogProduct[] = [
  {
    name: 'Laptop Audit',
    sku: 'SKU-1',
    brand: 'Marca',
    price: 1000,
    category_main: 'Tecnología',
    images: ['https://example.com/laptop.png'],
  },
]

const originalFetch = global.fetch
const fetchMock = jest.fn((): Promise<Response> =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => catalog,
  } as Response)
)

beforeEach(() => {
  fetchMock.mockClear()
  global.fetch = fetchMock
})

afterEach(() => {
  global.fetch = originalFetch
  jest.restoreAllMocks()
})

describe('CatalogViewer imágenes', () => {
  it('renderiza grid y detalle con next/image manteniendo src, alt y clases', async () => {
    render(<CatalogViewer />)

    expect(await screen.findByText('Laptop Audit')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/data/catalog.json')

    const gridImages = screen.getAllByAltText('Laptop Audit')
    expect(gridImages).toHaveLength(1)
    expect(gridImages[0]).toHaveAttribute('src', 'https://example.com/laptop.png')
    expect(gridImages[0]).toHaveAttribute('data-nimg', 'fill')
    expect(gridImages[0]).toHaveClass('object-contain', 'group-hover:scale-110')

    fireEvent.click(screen.getByText('Laptop Audit'))

    const detailImages = screen.getAllByAltText('Laptop Audit')
    expect(detailImages).toHaveLength(2)
    detailImages.forEach(img => {
      expect(img).toHaveAttribute('src', 'https://example.com/laptop.png')
      expect(img).toHaveAttribute('data-nimg', 'fill')
      expect(img).toHaveClass('object-contain')
    })
  })
})
