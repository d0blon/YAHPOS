import iconv from 'iconv-lite';
import { toBuffer } from 'bwip-js';

/**
 * El SII no valida la firma del TED leyendo el XML: lee el código de barras impreso y
 * verifica la firma sobre ESOS bytes. Dos cosas tienen que coincidir exactamente con el
 * TED firmado:
 *
 *   1. los bytes: el timbre es ISO-8859-1 (no UTF-8). `binarytext` le dice a bwip-js que
 *      cada caracter del string ya es un byte; sin eso convierte a UTF-8 y los acentos
 *      cambian de longitud.
 *   2. el contenido completo: el TED entero, sin recortar.
 *
 * Capacidad: PDF417 admite como máximo 1113 bytes en compactación por bytes. El TED
 * incluye la llave pública del CAF (`RSAPK`), así que un CAF de 2048 bits lo desborda:
 * el SII emite CAF con llave de 1024 bits.
 */
export const PDF417_MAX_BYTES = 1113;

/** Columnas del símbolo: ~2.2 de proporción, legible a 203 dpi en papel de 80 mm. */
const COLUMNS = 16;
const ECC_LEVEL = 2;
const SCALE = 3;

export async function generarTimbrePdf417(ted: string): Promise<Buffer> {
  const bytes = iconv.encode(ted, 'ISO-8859-1');

  if (bytes.length > PDF417_MAX_BYTES) {
    throw new Error(
      `El TED pesa ${bytes.length} B y no cabe en un PDF417 (máximo ${PDF417_MAX_BYTES} B). ` +
        'Revisar el tamaño de la llave del CAF.',
    );
  }

  return toBuffer({
    bcid: 'pdf417',
    text: bytes.toString('binary'),
    binarytext: true,
    scale: SCALE,
    columns: COLUMNS,
    ecclevel: ECC_LEVEL,
    paddingwidth: 2,
    paddingheight: 2,
    backgroundcolor: 'FFFFFF',
  });
}
