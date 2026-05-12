import { orderSchema } from '../orders';

describe('orderSchema', () => {
  const validOrder = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    total: 10000,
    source: 'ecommerce',
    paymentMethod: 'card',
    items: [
      {
        product_id: '550e8400-e29b-41d4-a716-446655440001',
        quantity: 2,
        unit_price: 5000,
      }
    ]
  };

  it('should validate a correct ecommerce order', () => {
    const result = orderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
  });

  it('should validate a correct POS order', () => {
    const posOrder = { ...validOrder, source: 'pos' };
    const result = orderSchema.safeParse(posOrder);
    expect(result.success).toBe(true);
  });

  it('should fail if total is negative', () => {
    const invalidOrder = { ...validOrder, total: -1 };
    const result = orderSchema.safeParse(invalidOrder);
    expect(result.success).toBe(false);
  });

  it('should fail if items list is empty', () => {
    const invalidOrder = { ...validOrder, items: [] };
    const result = orderSchema.safeParse(invalidOrder);
    expect(result.success).toBe(false);
  });

  it('should fail if source is invalid', () => {
    const invalidOrder = { ...validOrder, source: 'invalid' };
    const result = orderSchema.safeParse(invalidOrder);
    expect(result.success).toBe(false);
  });
});
