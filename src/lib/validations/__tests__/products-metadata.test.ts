import { productSchema, type ProductInput } from '../products'

type IsAny<T> = 0 extends 1 & T ? true : false
type IsUnknown<T> = unknown extends T ? (IsAny<T> extends true ? false : true) : false
type Assert<T extends true> = T

describe('productSchema.supplierMetadata', () => {
  const producto = {
    name: 'Producto de prueba',
    price: 100,
    stock: 1,
    category: 'General',
  }

  it('acepta metadata arbitraria', () => {
    const metadatas: unknown[] = [
      { origen: 'proveedor', filas: [1, 2] },
      ['texto', 42],
      'texto',
      42,
      null,
    ]

    for (const metadata of metadatas) {
      const result = productSchema.safeParse({ ...producto, supplierMetadata: metadata })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.supplierMetadata).toBe(metadata)
      }
    }
  })

  it('infirió unknown, no any', () => {
    const noEsAny: Assert<IsAny<ProductInput['supplierMetadata']> extends false ? true : false> = true
    const esUnknown: Assert<IsUnknown<ProductInput['supplierMetadata']>> = true

    expect(noEsAny).toBe(true)
    expect(esUnknown).toBe(true)
  })
})
