import type { DteDetail, DtePayload } from './types';
import { validateRut } from '../utils';

/**
 * Convierte una venta del POS en el `DtePayload` que se firma.
 *
 * Antes el POS encolaba `{ items, totals, type, folio }`, un objeto que no tiene
 * `Encabezado` ni `Detalles`: el motor emitía un documento sin receptor y sin líneas
 * y el SII lo rechaza por aritmética. También se perdía el descuento (canje de
 * puntos): `MntTotal` salía mayor que lo que pagó el cliente.
 *
 * Convención de montos: los precios del POS son **brutos** (IVA incluido) y la
 * boleta del SII interpreta `MontoItem` como bruto, así que no hay que convertir a
 * neto acá. El neto y el IVA los calcula `engine.calculateTaxes()` sobre la suma.
 */

export interface ItemVentaPos {
  nombre: string;
  cantidad: number;
  /** Precio unitario bruto (IVA incluido), tal como está en el catálogo. */
  precioBruto: number;
  exento?: boolean;
}

export interface VentaPos {
  tipo?: 39 | 41;
  /** AAAA-MM-DD en hora de Chile. */
  fecha: string;
  folio?: number | null;
  items: ItemVentaPos[];
  /** Lo que efectivamente pagó el cliente, después de descuentos. */
  totalBruto: number;
  rutReceptor?: string | null;
  nombreReceptor?: string | null;
}

export const RUT_CONSUMIDOR_FINAL = '66666666-6';

const LARGO_MAXIMO_ITEM = 80;

/**
 * El SII exige un RUT con dígito verificador. Si el cajero ingresó algo que no lo
 * es, se emite como consumidor final en vez de inventar un receptor: un RUT
 * inválido hace rechazar el documento completo.
 */
export function normalizarRut(rut: string | null | undefined): string | null {
  if (!rut) return null;
  const limpio = rut.replace(/[.\s]/g, '').toUpperCase();
  if (!/^\d{7,8}-[\dK]$/.test(limpio)) return null;
  // El dígito verificador es lo que el SII valida: un RUT con formato correcto y
  // DV equivocado hace rechazar el documento igual que uno mal escrito.
  if (!validateRut(limpio)) return null;
  return limpio;
}

/** Redondeo a 5 decimales, el máximo que acepta `Dec5Type` del SII. */
function precioUnitario(monto: number, cantidad: number): number {
  if (cantidad <= 0) return 0;
  return Math.round((monto / cantidad) * 100000) / 100000;
}

export function payloadDesdeVentaPos(venta: VentaPos): DtePayload {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(venta.fecha)) {
    throw new Error(`Fecha de emisión inválida: "${venta.fecha}" (se espera AAAA-MM-DD)`);
  }

  const items = venta.items.filter((i) => i.cantidad > 0 && i.precioBruto >= 0);
  if (items.length === 0) {
    throw new Error('La venta no tiene ítems emitibles.');
  }

  const brutos = items.map((i) => Math.round(i.cantidad * i.precioBruto));
  const sumaBruta = brutos.reduce((a, b) => a + b, 0);

  if (sumaBruta <= 0) {
    throw new Error('La venta no tiene monto: no se puede emitir un DTE en $0.');
  }
  if (venta.totalBruto <= 0) {
    throw new Error(`Total pagado inválido (${venta.totalBruto}): debe ser mayor que cero.`);
  }

  // El descuento de la venta (canje de puntos) se reparte en proporción al peso de
  // cada línea, para que la suma de `MontoItem` sea exactamente lo cobrado.
  const factor = venta.totalBruto / sumaBruta;
  const montos = brutos.map((b) => Math.round(b * factor));
  const residuo = venta.totalBruto - montos.reduce((a, b) => a + b, 0);
  if (residuo !== 0) {
    // El residuo de redondeo cae en la línea más grande: repartirlo en varias
    // líneas hace que ninguna cuadre con su propio precio unitario.
    let mayor = 0;
    for (let i = 1; i < montos.length; i++) {
      if (montos[i] > montos[mayor]) mayor = i;
    }
    montos[mayor] += residuo;
  }

  const detalles: DteDetail[] = items.map((item, i) => {
    const monto = montos[i];
    return {
      NmbItem: item.nombre.slice(0, LARGO_MAXIMO_ITEM),
      QtyItem: item.cantidad,
      PrcItem: precioUnitario(monto, item.cantidad),
      MontoItem: monto,
      ...(item.exento ? { IndExe: 1 as const } : {}),
    };
  });

  const rutReceptor = normalizarRut(venta.rutReceptor) ?? RUT_CONSUMIDOR_FINAL;
  const nombreReceptor = normalizarRut(venta.rutReceptor) ? venta.nombreReceptor ?? undefined : undefined;

  return {
    Encabezado: {
      TipoDTE: venta.tipo ?? 39,
      // 0 = el motor pide el siguiente folio disponible en el CAF.
      Folio: venta.folio ?? 0,
      FchEmis: venta.fecha,
      IndServicio: 3,
      RUTRecep: rutReceptor,
      ...(nombreReceptor ? { RznSocRecep: nombreReceptor.slice(0, 40) } : {}),
      // `calculateTaxes()` lo recalcula desde las líneas; se deja explícito para que
      // un consumidor del payload no tenga que reproducir la aritmética del SII.
      MntTotal: montos.reduce((a, b) => a + b, 0),
    },
    Detalles: detalles,
  };
}
