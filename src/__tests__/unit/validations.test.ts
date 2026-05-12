import { orderSchema } from '@/lib/validations/orders'
import { productSchema } from '@/lib/validations/products'
import { customerSchema } from '@/lib/validations/customers'

describe('Zod Schemas Validations', () => {
  describe('Product Schema', () => {
    it('should validate a correct product', () => {
      const validProduct = {
        name: 'Vino Tinto Reserva',
        price: 15000,
        stock: 50,
        category: 'Vinos',
        store_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      const result = productSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
    })

    it('should fail if price is negative', () => {
      const invalidProduct = {
        name: 'Vino',
        price: -1,
        stock: 10,
        category: 'Vinos',
        store_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      const result = productSchema.safeParse(invalidProduct)
      expect(result.success).toBe(false)
    })
  })

  describe('Order Schema', () => {
    it('should validate a correct POS order', () => {
      const validOrder = {
        items: [
          { product_id: '123e4567-e89b-12d3-a456-426614174000', unit_price: 1000, quantity: 2 }
        ],
        total: 2000,
        paymentMethod: 'efectivo',
        source: 'pos',
        userId: '123e4567-e89b-12d3-a456-426614174000'
      }
      const result = orderSchema.safeParse(validOrder)
      expect(result.success).toBe(true)
    })
  })

  describe('Customer Schema', () => {
    it('should fail if email is invalid', () => {
      const invalidCustomer = {
        full_name: 'Juan Perez',
        email: 'not-an-email',
        store_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      const result = customerSchema.safeParse(invalidCustomer)
      expect(result.success).toBe(false)
    })
  })
})
