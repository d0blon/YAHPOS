import type { DtePayload } from '@/lib/sii/types'

export type TipoDtePrueba = 33 | 39 | 41 | 52 | 56 | 61

export interface CasoPruebaSii {
  id: string
  tipo: TipoDtePrueba
  titulo: string
  descripcion: string
  /** Tipo cuyo CAF vigente se exige para habilitar el caso (fail-closed). */
  requiresCaf: TipoDtePrueba
  flags: {
    consumeFolio: true
    envioReal: true
  }
  buildPayload: (fecha: string) => DtePayload
}

const RECEPTOR = {
  RUTRecep: '66666666-6',
  RznSocRecep: 'RECEPTOR PRUEBA SII',
}

function encabezado(
  tipo: TipoDtePrueba,
  fecha: string,
  extras: Partial<Omit<DtePayload['Encabezado'], 'TipoDTE' | 'MntTotal'>> & { MntTotal: number },
): DtePayload['Encabezado'] {
  return {
    TipoDTE: tipo,
    Folio: 0,
    FchEmis: fecha,
    ...RECEPTOR,
    TasaIVA: 19,
    ...extras,
  }
}

/**
 * Catálogo del set de pruebas SII. Ningún caso contiene certificados, claves ni
 * folios preasignados: el motor reserva el folio real del CAF vigente al emitir.
 * Todos los casos son reales: firman con el certificado de la tienda y se envían
 * al SII; cada ejecución consume un folio.
 */
export const SII_TEST_CASES: readonly CasoPruebaSii[] = [
  {
    id: 'B39_AFECTA',
    tipo: 39,
    titulo: 'Boleta afecta',
    descripcion: 'Boleta tipo 39 con un Ítem afecto a IVA. Caso mínimo de timbrado y envío real.',
    requiresCaf: 39,
    flags: { consumeFolio: true, envioReal: true },
    buildPayload: (fecha) => ({
      Encabezado: encabezado(39, fecha, { MntNeto: 10000, IVA: 1900, MntTotal: 11900 }),
      Detalles: [
        { NmbItem: 'ITEM AFECTO PRUEBA SII', QtyItem: 1, PrcItem: 11900, MontoItem: 11900 },
      ],
    }),
  },
  {
    id: 'B39_MULTI_ITEM',
    tipo: 39,
    titulo: 'Boleta multi-ítem',
    descripcion: 'Boleta tipo 39 con tres líneas afectas; valida el cálculo del IVA sobre el total.',
    requiresCaf: 39,
    flags: { consumeFolio: true, envioReal: true },
    buildPayload: (fecha) => ({
      Encabezado: encabezado(39, fecha, { MntNeto: 9613, IVA: 1827, MntTotal: 11440 }),
      Detalles: [
        { NmbItem: 'ITEM A', QtyItem: 2, PrcItem: 1990, MontoItem: 3980 },
        { NmbItem: 'ITEM B', QtyItem: 1, PrcItem: 3500, MontoItem: 3500 },
        { NmbItem: 'ITEM C', QtyItem: 4, PrcItem: 990, MontoItem: 3960 },
      ],
    }),
  },
  {
    id: 'B39_MIXTA',
    tipo: 39,
    titulo: 'Boleta mixta afecta/exenta',
    descripcion: 'Boleta tipo 39 con un ítem afecto y otro exento (IndExe=1); valida MntExe e IVA.',
    requiresCaf: 39,
    flags: { consumeFolio: true, envioReal: true },
    buildPayload: (fecha) => ({
      Encabezado: encabezado(39, fecha, {
        MntNeto: 10000,
        IVA: 1900,
        MntExe: 5000,
        MntTotal: 16900,
      }),
      Detalles: [
        { NmbItem: 'ITEM AFECTO', QtyItem: 1, PrcItem: 11900, MontoItem: 11900 },
        { NmbItem: 'ITEM EXENTO', QtyItem: 1, PrcItem: 5000, MontoItem: 5000, IndExe: 1 },
      ],
    }),
  },
  {
    id: 'B39_DECIMALES',
    tipo: 39,
    titulo: 'Boleta con decimales',
    descripcion: 'Boleta tipo 39 con precio unitario decimal; verifica el redondeo del motor a pesos enteros.',
    requiresCaf: 39,
    flags: { consumeFolio: true, envioReal: true },
    buildPayload: (fecha) => ({
      Encabezado: encabezado(39, fecha, { MntNeto: 3982, IVA: 757, MntTotal: 4739 }),
      Detalles: [
        { NmbItem: 'ITEM PRECIO DECIMAL', QtyItem: 3, PrcItem: 1579.5, MontoItem: 4738.5 },
      ],
    }),
  },
  {
    id: 'B41_EXENTA',
    tipo: 41,
    titulo: 'Boleta exenta',
    descripcion: 'Boleta tipo 41 sin IVA. Requiere CAF vigente de tipo 41 (pendiente de verificación SII).',
    requiresCaf: 41,
    flags: { consumeFolio: true, envioReal: true },
    buildPayload: (fecha) => ({
      Encabezado: encabezado(41, fecha, { MntExe: 5000, MntTotal: 5000 }),
      Detalles: [
        { NmbItem: 'ITEM EXENTO 41', QtyItem: 1, PrcItem: 5000, MontoItem: 5000, IndExe: 1 },
      ],
    }),
  },
  {
    id: 'F33_AFECTA',
    tipo: 33,
    titulo: 'Factura afecta',
    descripcion: 'Factura tipo 33 con IVA. Requiere CAF vigente de tipo 33 y acteco configurado (pendiente de verificación SII).',
    requiresCaf: 33,
    flags: { consumeFolio: true, envioReal: true },
    buildPayload: (fecha) => ({
      Encabezado: encabezado(33, fecha, { MntNeto: 10000, IVA: 1900, MntTotal: 11900 }),
      Detalles: [
        { NmbItem: 'FACTURA PRUEBA SII', QtyItem: 1, PrcItem: 11900, MontoItem: 11900 },
      ],
    }),
  },
  {
    id: 'G52_DESPACHO',
    tipo: 52,
    titulo: 'Guía de despacho',
    descripcion: 'Guía tipo 52 de traslado por venta. Requiere CAF vigente de tipo 52 (pendiente de verificación SII).',
    requiresCaf: 52,
    flags: { consumeFolio: true, envioReal: true },
    buildPayload: (fecha) => ({
      Encabezado: encabezado(52, fecha, {
        MntNeto: 8403,
        IVA: 1597,
        MntTotal: 10000,
        TipoDespacho: 1,
        IndTraslado: 1,
      }),
      Detalles: [
        { NmbItem: 'GUIA PRUEBA SII', QtyItem: 1, PrcItem: 10000, MontoItem: 10000 },
      ],
    }),
  },
  {
    id: 'ND56',
    tipo: 56,
    titulo: 'Nota de débito',
    descripcion: 'Nota de débito tipo 56 con referencia a boleta. Requiere CAF vigente de tipo 56 (pendiente de verificación SII).',
    requiresCaf: 56,
    flags: { consumeFolio: true, envioReal: true },
    buildPayload: (fecha) => ({
      Encabezado: encabezado(56, fecha, {
        MntNeto: 4202,
        IVA: 798,
        MntTotal: 5000,
        Referencias: [
          { TpoDocRef: 39, FolioRef: 1, FchRef: fecha, CodRef: 1, RazonRef: 'PRUEBA SII' },
        ],
      }),
      Detalles: [
        { NmbItem: 'NOTA DEBITO PRUEBA SII', QtyItem: 1, PrcItem: 5000, MontoItem: 5000 },
      ],
    }),
  },
  {
    id: 'NC61',
    tipo: 61,
    titulo: 'Nota de crédito',
    descripcion: 'Nota de crédito tipo 61 con referencia a boleta. Requiere CAF vigente de tipo 61 (pendiente de verificación SII).',
    requiresCaf: 61,
    flags: { consumeFolio: true, envioReal: true },
    buildPayload: (fecha) => ({
      Encabezado: encabezado(61, fecha, {
        MntNeto: 4202,
        IVA: 798,
        MntTotal: 5000,
        Referencias: [
          { TpoDocRef: 39, FolioRef: 1, FchRef: fecha, CodRef: 1, RazonRef: 'ANULACION PRUEBA SII' },
        ],
      }),
      Detalles: [
        { NmbItem: 'NOTA CREDITO PRUEBA SII', QtyItem: 1, PrcItem: 5000, MontoItem: 5000 },
      ],
    }),
  },
]

export function getCasoPrueba(id: string): CasoPruebaSii | undefined {
  return SII_TEST_CASES.find((caso) => caso.id === id)
}
