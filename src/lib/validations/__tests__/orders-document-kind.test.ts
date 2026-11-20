import { orderSchema } from '../orders';

describe('orderSchema — documentKind / siiSkipReason', () => {
  const base = {
    total: 10000,
    paymentMethod: 'JUNAEB',
    items: [{ productId: '550e8400-e29b-41d4-a716-446655440001', quantity: 1 }],
  };

  it('acepta voucher con su motivo de salto SII', () => {
    const result = orderSchema.safeParse({
      ...base,
      offlineId: 'POS-123',
      documentKind: 'voucher',
      siiSkipReason: 'voucher_method',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documentKind).toBe('voucher');
      expect(result.data.siiSkipReason).toBe('voucher_method');
    }
  });

  it('acepta dte emitido por SII', () => {
    const result = orderSchema.safeParse({
      ...base,
      documentKind: 'dte',
      siiSkipReason: 'sii',
    });
    expect(result.success).toBe(true);
  });

  it('rechaza documentKind inválido', () => {
    const result = orderSchema.safeParse({ ...base, documentKind: 'boleta' });
    expect(result.success).toBe(false);
  });

  it('rechaza siiSkipReason inválido', () => {
    const result = orderSchema.safeParse({ ...base, siiSkipReason: 'cualquiera' });
    expect(result.success).toBe(false);
  });

  it('sigue siendo strict con campos desconocidos', () => {
    const result = orderSchema.safeParse({ ...base, siiDecision: { kind: 'voucher' } });
    expect(result.success).toBe(false);
  });
});
