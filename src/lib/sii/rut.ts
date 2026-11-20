/**
 * RUT chileno en sus dos partes.
 *
 * Las consultas SOAP del SII (`QueryEstUp`, `QueryEstDte`) no reciben el RUT completo:
 * piden `RutCompania` (número) y `DvCompania` (dígito verificador) por separado. Partir
 * mal el RUT hace que el SII responda "RUT NO EXISTE" y el envío queda sin veredicto.
 *
 * Los RUT llegan con puntos desde los formularios (`76.123.456-7`) y el DV puede venir en
 * minúscula; el SII espera el número sin puntos y el DV en mayúscula.
 */
export interface RutPartes {
  numero: string;
  dv: string;
}

export function dividirRut(rut: string): RutPartes {
  const limpio = (rut ?? '').replace(/\./g, '').trim();
  const guion = limpio.lastIndexOf('-');

  if (guion <= 0 || guion === limpio.length - 1) {
    throw new Error(`RUT del emisor inválido (${rut}): se espera 12345678-9`);
  }

  const numero = limpio.slice(0, guion);
  const dv = limpio.slice(guion + 1).toUpperCase();

  if (!/^\d+$/.test(numero) || !/^[0-9K]$/.test(dv)) {
    throw new Error(`RUT del emisor inválido (${rut}): se espera 12345678-9`);
  }

  return { numero, dv };
}
