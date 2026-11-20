import { escapar, extraerBloque, estadoYGlosa, postSoap, sobreSoap, SII_HOSTS, type SiiAmbiente } from './soap';
import { formatFechaDDMMYYYY } from './fecha-chile';

/**
 * Consulta del estado de un envío ya recepcionado (`STATUS=0` + `TRACKID`).
 *
 * Tener track id **no** significa aceptado: el SII revisa después y el veredicto sale de
 * `QueryEstUp.getEstUp` / `QueryEstDte.getEstDte`. `EPR` (en proceso) tampoco es aceptado;
 * solo `ACEPTADOS` lo es.
 *
 * Los parámetros salen del WSDL vivo (verificado 2026-11-13):
 *   getEstUp  (RutCompania, DvCompania, TrackId, Token)
 *   getEstDte (RutConsultante, DvConsultante, RutCompania, DvCompania,
 *              RutReceptor, DvReceptor, TipoDte, FolioDte, FechaEmisionDte, MontoDte, Token)
 *
 * La consulta usa códigos de 3 dígitos: `000` es consulta resuelta, `001` por ejemplo es
 * "TOKEN NO EXISTE". El veredicto del documento viene aparte, en `RESP_BODY`.
 */

/** `<ESTADO>` de éxito de las consultas (3 dígitos, no confundir con el `00` de la semilla). */
const ESTADO_CONSULTA_OK = '000';

export type Veredicto = 'ACEPTADO' | 'RECHAZADO' | 'DESCONOCIDO';

export interface EstadoSii {
  /** La consulta se resolvió (ESTADO 000). No dice si el DTE fue aceptado. */
  consultaOk: boolean;
  codigo?: string;
  glosa?: string;
  /** Contenido crudo de `RESP_BODY`, con los campos que el SII decida mandar. */
  cuerpo: string;
  veredicto: Veredicto;
  raw: string;
}

/**
 * Solo se afirma lo que el SII escribe con todas sus letras. Códigos abreviados
 * (`EPR`, `RFR`, `RSC`, `RCT`) quedan como `DESCONOCIDO` a propósito: deducir que un
 * envío fue aceptado por un código que nadie verificó es cómo se pierde un DTE.
 */
export function veredictoDesde(cuerpo: string): Veredicto {
  const texto = cuerpo.toUpperCase();
  if (/NO\s+ACEPTADOS/.test(texto)) return 'RECHAZADO';
  if (/RECHAZADOS/.test(texto)) return 'RECHAZADO';
  if (/ACEPTADOS/.test(texto)) return 'ACEPTADO';
  return 'DESCONOCIDO';
}

export function parsearEstadoSii(respuestaSoap: string): EstadoSii {
  const { estado, glosa } = estadoYGlosa(respuestaSoap);
  const cuerpo = extraerBloque(respuestaSoap, 'RESP_BODY') ?? '';
  return {
    consultaOk: estado === ESTADO_CONSULTA_OK,
    codigo: estado,
    glosa,
    cuerpo: cuerpo.trim(),
    veredicto: veredictoDesde(cuerpo),
    raw: respuestaSoap,
  };
}

export interface ConsultaUpload {
  rutCompania: string;
  dvCompania: string;
  trackId: string;
  token: string;
}

export function sobreEstadoUpload(c: ConsultaUpload): string {
  return sobreSoap(
    'getEstUp',
    [
      `<RutCompania>${escapar(c.rutCompania)}</RutCompania>`,
      `<DvCompania>${escapar(c.dvCompania)}</DvCompania>`,
      `<TrackId>${escapar(c.trackId)}</TrackId>`,
      `<Token>${escapar(c.token)}</Token>`,
    ].join(''),
  );
}

export interface ConsultaDte {
  rutConsultante: string;
  dvConsultante: string;
  rutCompania: string;
  dvCompania: string;
  rutReceptor: string;
  dvReceptor: string;
  tipoDte: number;
  folio: number;
  /** Se envía tal cual: el formato que espera `getEstDte` no está verificado contra el SII. */
  fechaEmision: string;
  monto: number;
  token: string;
}

export function sobreEstadoDte(c: ConsultaDte): string {
  return sobreSoap(
    'getEstDte',
    [
      `<RutConsultante>${escapar(c.rutConsultante)}</RutConsultante>`,
      `<DvConsultante>${escapar(c.dvConsultante)}</DvConsultante>`,
      `<RutCompania>${escapar(c.rutCompania)}</RutCompania>`,
      `<DvCompania>${escapar(c.dvCompania)}</DvCompania>`,
      `<RutReceptor>${escapar(c.rutReceptor)}</RutReceptor>`,
      `<DvReceptor>${escapar(c.dvReceptor)}</DvReceptor>`,
      `<TipoDte>${c.tipoDte}</TipoDte>`,
      `<FolioDte>${c.folio}</FolioDte>`,
      `<FechaEmisionDte>${escapar(formatFechaDDMMYYYY(c.fechaEmision))}</FechaEmisionDte>`,
      `<MontoDte>${Math.round(c.monto)}</MontoDte>`,
      `<Token>${escapar(c.token)}</Token>`,
    ].join(''),
  );
}

export async function consultarEstadoUpload(
  ambiente: SiiAmbiente,
  consulta: ConsultaUpload,
): Promise<EstadoSii> {
  const xml = await postSoap(SII_HOSTS[ambiente], 'QueryEstUp.jws', sobreEstadoUpload(consulta));
  return parsearEstadoSii(xml);
}

export async function consultarEstadoDte(
  ambiente: SiiAmbiente,
  consulta: ConsultaDte,
): Promise<EstadoSii> {
  const xml = await postSoap(SII_HOSTS[ambiente], 'QueryEstDte.jws', sobreEstadoDte(consulta));
  return parsearEstadoSii(xml);
}
