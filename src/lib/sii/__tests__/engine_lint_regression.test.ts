import { SiiEngine } from '@/lib/sii/engine'
import type { DtePayload } from '@/lib/sii/types'

process.env.SII_ENCRYPTION_KEY = 'test-key-32-chars-long-1234567890'

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({})),
}))

interface MotorConCalculoImpuestos {
  calculateTaxes(payload: DtePayload): void
}

type Impuestos = Pick<
  DtePayload['Encabezado'],
  'MntNeto' | 'MntExe' | 'IVA' | 'MntTotal' | 'TasaIVA'
>

function calcular(payload: DtePayload): Impuestos {
  const motor = new SiiEngine() as unknown as MotorConCalculoImpuestos
  motor.calculateTaxes(payload)
  const { MntNeto, MntExe, IVA, MntTotal, TasaIVA } = payload.Encabezado
  return { MntNeto, MntExe, IVA, MntTotal, TasaIVA }
}

function payloadCon(
  tipo: DtePayload['Encabezado']['TipoDTE'],
  indExe?: 1
): DtePayload {
  return {
    Encabezado: {
      TipoDTE: tipo,
      Folio: 1,
      FchEmis: '2026-01-01',
      MntTotal: 0,
    },
    Detalles: [
      {
        NmbItem: 'Producto',
        QtyItem: 1,
        PrcItem: 1190,
        MontoItem: 1190,
        ...(indExe === 1 ? { IndExe: 1 as const } : {}),
      },
    ],
  }
}

describe('calculateTaxes — regresión de lint (isExento sin uso)', () => {
  it('DTE 39 sin IndExe: neto e IVA sobre total afecto', () => {
    expect(calcular(payloadCon(39))).toStrictEqual({
      MntNeto: 1000,
      MntExe: undefined,
      IVA: 190,
      MntTotal: 1190,
      TasaIVA: 19,
    })
  })

  it('DTE 39 con IndExe: monto íntegro a exento, sin IVA', () => {
    expect(calcular(payloadCon(39, 1))).toStrictEqual({
      MntNeto: 0,
      MntExe: 1190,
      IVA: 0,
      MntTotal: 1190,
      TasaIVA: 19,
    })
  })

  it('DTE 41 sin IndExe: todo a exento, sin neto ni IVA', () => {
    expect(calcular(payloadCon(41))).toStrictEqual({
      MntNeto: undefined,
      MntExe: 1190,
      IVA: undefined,
      MntTotal: 1190,
      TasaIVA: undefined,
    })
  })

  it('DTE 41 con IndExe: idéntico a sin IndExe', () => {
    expect(calcular(payloadCon(41, 1))).toStrictEqual(calcular(payloadCon(41)))
  })

  it('DTE 41 mixto: ítem afecto por omisión y exento explícito suman a MntExe', () => {
    const payload = payloadCon(41)
    payload.Detalles.push({
      NmbItem: 'Item exento',
      QtyItem: 1,
      PrcItem: 100,
      MontoItem: 100,
      IndExe: 1,
    })

    expect(calcular(payload)).toStrictEqual({
      MntNeto: undefined,
      MntExe: 1290,
      IVA: undefined,
      MntTotal: 1290,
      TasaIVA: undefined,
    })
  })

  it('DTE 33 sin IndExe: neto e IVA sobre total afecto', () => {
    expect(calcular(payloadCon(33))).toStrictEqual({
      MntNeto: 1000,
      MntExe: undefined,
      IVA: 190,
      MntTotal: 1190,
      TasaIVA: 19,
    })
  })

  it('DTE 33 con IndExe: monto íntegro a exento, sin IVA', () => {
    expect(calcular(payloadCon(33, 1))).toStrictEqual({
      MntNeto: 0,
      MntExe: 1190,
      IVA: 0,
      MntTotal: 1190,
      TasaIVA: 19,
    })
  })

  it('DTE 33 mixto: afecto e IndExe se separan sin cruzar montos', () => {
    const payload = payloadCon(33)
    payload.Detalles.push({
      NmbItem: 'Item exento',
      QtyItem: 1,
      PrcItem: 100,
      MontoItem: 100,
      IndExe: 1,
    })

    expect(calcular(payload)).toStrictEqual({
      MntNeto: 1000,
      MntExe: 100,
      IVA: 190,
      MntTotal: 1290,
      TasaIVA: 19,
    })
  })
})
