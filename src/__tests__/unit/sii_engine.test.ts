import { SiiEngine } from '@/lib/sii/engine'
import { createClient } from '@supabase/supabase-js'

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
    const payload: any = { Encabezado: { TipoDTE: 39, MntTotal: 1000 } }
    await expect(engine.emitirBoleta(payload, 'store-123')).rejects.toThrow('Motor no inicializado')
  })

  // Aquí se podrían añadir más tests mockeando initForStore
})
