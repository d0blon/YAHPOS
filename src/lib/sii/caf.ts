import { XMLParser } from 'fast-xml-parser';

export interface CafData {
  rut: string;
  tipoDte: number;
  desde: number;
  hasta: number;
  fecha: string;
  privateKey: string;
  xmlCompleto: string;
}

export class SiiCafParser {
  /**
   * Toma el contenido de un archivo CAF (.xml) y extrae los datos clave
   */
  public static parse(xmlContent: string): CafData {
    const parser = new XMLParser({ ignoreAttributes: false });
    const jsonObj = parser.parse(xmlContent);

    const da = jsonObj.AUTORIZACION.CAF.DA;
    const rsask = jsonObj.AUTORIZACION.RSASK;

    if (!da || !rsask) {
      throw new Error('Archivo CAF inválido: Falta sección DA o RSASK');
    }

    return {
      rut: da.RE,
      tipoDte: parseInt(da.TD),
      desde: parseInt(da.RNG.D),
      hasta: parseInt(da.RNG.H),
      fecha: da.FA,
      privateKey: rsask,
      xmlCompleto: xmlContent
    };
  }
}
