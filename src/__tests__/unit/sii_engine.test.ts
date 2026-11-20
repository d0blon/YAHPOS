import { SiiEngine } from '@/lib/sii/engine'
import type { DtePayload } from '@/lib/sii/types'

// Mock de variables de entorno
process.env.SII_ENCRYPTION_KEY = 'test-key-32-chars-long-1234567890';

// Mock de Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    rpc: jest.fn().mockResolvedValue({ data: [{ v_folio_actual: 100 }], error: null }),
    insert: jest.fn().mockReturnThis(),
  })),
}))

describe('SiiEngine Unit Tests', () => {
  let engine: SiiEngine

  beforeEach(() => {
    jest.clearAllMocks()
    engine = new SiiEngine()
  })

  it('should fail to emit if not initialized', async () => {
    const payload: DtePayload = {
      Encabezado: { TipoDTE: 39, Folio: 1, FchEmis: '2026-01-01', MntTotal: 1000 },
      Detalles: [],
    }
    await expect(engine.emitirBoleta(payload, 'store-123')).rejects.toThrow('Motor no inicializado')
  })

  // Aquí se podrían añadir más tests mockeando initForStore
})
