import { XMLParser } from 'fast-xml-parser';
import type { BoletaPdfData, PdfReferencia, PdfResolucion, PdfTotales } from './pdf-generator';

/**
 * Traduce el XML del DTE guardado en `sii_documents.xml_content` a los datos que
 * consume el generador de PDF.
 *
 * Los nombres de los campos NO son iguales entre plantillas: las boletas usan
 * `RznSocEmisor` / `GiroEmisor` (los exige `EnvioBOLETA_v11.xsd`) y las facturas
 * `RznSoc` / `GiroEmis` (`DTE_v10.xsd`). Leer uno solo de los dos imprime el
 * documento sin giro ni dirección.
 */

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

export type Settings = Record<string, string>;

type Nodo = Record<string, unknown>;

function texto(valor: unknown): string | undefined {
  if (typeof valor === 'string') return valor;
  if (typeof valor === 'number') return String(valor);
  return undefined;
}

function numero(valor: unknown): number | undefined {
  const n = typeof valor === 'number' ? valor : Number(texto(valor));
  return Number.isFinite(n) ? n : undefined;
}

function comoObjeto(valor: unknown): Nodo {
  return valor && typeof valor === 'object' ? (valor as Nodo) : {};
}

/**
 * El TED impreso tiene que ser EXACTAMENTE el que se firmó, así que se recorta del
 * XML original en vez de re-serializarlo desde el árbol parseado (fast-xml-parser
 * normaliza espacios y comillas).
 */
function extraerTimbre(xmlContent: string): string {
  const ted = xmlContent.match(/<TED[\s\S]*?<\/TED>/)?.[0];
  if (!ted) {
    throw new Error('El XML del documento no contiene <TED>: no se puede timbrar el PDF.');
  }
  return ted;
}

function comoArreglo(valor: unknown): unknown[] {
  if (valor === undefined || valor === null) return [];
  return Array.isArray(valor) ? valor : [valor];
}

function referenciaDesde(valor: unknown): PdfReferencia | null {
  if (!valor || typeof valor !== 'object') return null;
  const nodo = valor as Nodo;
  const referencia: PdfReferencia = {
    tipo: texto(nodo.TpoDocRef),
    folio: texto(nodo.FolioRef),
    fecha: texto(nodo.FchRef),
    codigo: texto(nodo.CodRef),
    razon: texto(nodo.RazonRef),
  };
  return Object.values(referencia).some((v) => v !== undefined) ? referencia : null;
}

/**
 * Las plantillas no ponen las referencias siempre en el mismo sitio: boletas las
 * dejan dentro de `<IdDoc>` y facturas/notas como hijos directos de `<Documento>`.
 * `<CodRef>/<RazonRef>` sueltos en `IdDoc` son la referencia al set de pruebas SII.
 */
function extraerReferencias(documento: Nodo, encabezado: Nodo, idDoc: Nodo): PdfReferencia[] {
  const crudas = [
    ...comoArreglo(documento.Referencia),
    ...comoArreglo(encabezado.Referencia),
    ...comoArreglo(idDoc.Referencia),
  ];
  const referencias = crudas
    .map(referenciaDesde)
    .filter((ref): ref is PdfReferencia => ref !== null);

  const codigo = texto(idDoc.CodRef) ?? texto(encabezado.CodRef);
  const razon = texto(idDoc.RazonRef) ?? texto(encabezado.RazonRef);
  if (codigo || razon) referencias.push({ codigo, razon });

  return referencias;
}

export function extraerDatosPdf(
  xmlContent: string,
  opciones: { nombreTienda?: string; settings?: Settings; metadata?: Record<string, unknown> },
): BoletaPdfData {
  const settings = opciones.settings ?? {};
  const metadata = opciones.metadata ?? {};

  const xml = parser.parse(xmlContent) as Nodo;
  // El documento firmado es `<DTE><Documento>…`; toleramos `<Documento>` suelto.
  const raiz = comoObjeto(xml.DTE);
  const documento = comoObjeto(Object.keys(raiz).length > 0 ? raiz.Documento : xml.Documento);

  if (Object.keys(documento).length === 0) {
    throw new Error('El XML no tiene <Documento>: no es un DTE.');
  }

  const encabezado = comoObjeto(documento.Encabezado);
  const idDoc = comoObjeto(encabezado.IdDoc);
  const emisor = comoObjeto(encabezado.Emisor);
  const receptor = comoObjeto(encabezado.Receptor);
  const totales = comoObjeto(encabezado.Totales);

  const detallesRaw = documento.Detalle;
  const detalles = Array.isArray(detallesRaw) ? detallesRaw : [detallesRaw];

  const loyalty = comoObjeto(metadata.loyalty);
  const rutReceptor = texto(receptor.RUTRecep);

  const desglose: PdfTotales = {
    mntNeto: numero(totales.MntNeto),
    iva: numero(totales.IVA),
    tasaIVA: numero(totales.TasaIVA),
    mntExe: numero(totales.MntExe),
  };

  const resolucionMeta = comoObjeto(metadata.resolucion);
  const resolucion: PdfResolucion = {
    fchResol: texto(resolucionMeta.fchResol) ?? texto(metadata.fchResol),
    nroResol: numero(resolucionMeta.nroResol) ?? numero(metadata.nroResol),
  };

  return {
    tipoDte: numero(idDoc.TipoDTE),
    folio: numero(idDoc.Folio) ?? 0,
    fecha: texto(idDoc.FchEmis) ?? '',
    total: numero(totales.MntTotal) ?? 0,
    totales: desglose,
    resolucion,
    referencias: extraerReferencias(documento, encabezado, idDoc),
    items: detalles.map((detalle) => {
      const d = comoObjeto(detalle);
      return {
        nombre: texto(d.NmbItem) ?? '',
        cantidad: numero(d.QtyItem) ?? 1,
        precio: numero(d.PrcItem) ?? numero(d.MontoItem) ?? 0,
        total: numero(d.MontoItem) ?? 0,
      };
    }),
    emisor: {
      rut: texto(emisor.RUTEmisor) ?? '',
      razonSocial: opciones.nombreTienda ?? texto(emisor.RznSocEmisor) ?? texto(emisor.RznSoc) ?? '',
      giro: texto(emisor.GiroEmisor) ?? texto(emisor.GiroEmis) ?? 'Giro no especificado',
      direccion: texto(emisor.DirOrigen) ?? 'Dirección no especificada',
      logoUrl: settings.appearance_logo_url ?? '',
    },
    receptor: rutReceptor ? { rut: rutReceptor, nombre: texto(receptor.RznSocRecep) } : undefined,
    timbre: extraerTimbre(xmlContent),
    receipt: {
      message: settings.receipt_message ?? '¡Gracias por su compra!',
      showLogo: settings.receipt_show_logo !== 'false',
      logoUrl: settings.appearance_logo_url ?? '',
      colorMode: settings.receipt_color_mode === 'color' ? 'color' : 'bw',
      showPoweredBy: settings.receipt_show_powered_by !== 'false',
      poweredByText: settings.receipt_powered_by_text ?? 'Powered by YAHPOS!.cl',
      showLoyalty: settings.loyalty_enabled === 'true',
      loyaltyName: settings.loyalty_name ?? 'Puntos',
      pointsEarned: numero(loyalty.points_earned) ?? 0,
      pointsRedeemed: numero(loyalty.points_redeemed) ?? 0,
    },
  };
}
