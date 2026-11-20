import { bytesLatin1 } from './encoding';
import { timestampChile } from './fecha-chile';
import { dividirRut } from './rut';
import type { SiiSigner } from './signer';

/**
 * RCOF — Reporte (Archivo) de Consumo de Folios.
 *
 * Resume los folios consumidos en un período según `ConsumoFolio_v10.xsd`:
 * un `<DocumentoConsumoFolios ID>` con `<Caratula>` y 1..3 `<Resumen>` (uno por
 * tipo de documento), firmado con una `<ds:Signature>` hermana que referencia el ID.
 *
 * Solo entran los tipos del enum `TipoConsumoType` del XSD: 39 (boleta), 41 (boleta
 * exenta) y 61 (nota de crédito). Las facturas 33/34/52/56 van por EnvioDTE, no aquí.
 *
 * El XML se emite como string y se serializa a bytes ISO-8859-1 (`encoding.ts`):
 * el SII lee el archivo con el charset declarado y cualquier byte distinto del
 * texto firmado invalida la firma.
 */

/** Tipos admitidos por `TipoConsumoType` en ConsumoFolio_v10.xsd. */
export const TIPOS_RCOF = [39, 41, 61] as const;
export type TipoDocumentoRcof = (typeof TIPOS_RCOF)[number];

/** Tasa que se declara en `<TasaIVA>` cuando el resumen lleva IVA. */
const TASA_IVA_POR_DEFECTO = 19;

/**
 * Folio consumido en el período: un documento emitido o un folio anulado en el
 * sistema (opción "anulación de folios", NO documentos anulados por nota de crédito).
 */
export interface DocumentoRcof {
  /** 39 (boleta), 41 (boleta exenta) o 61 (nota de crédito). */
  tipo: number;
  folio: number;
  /** true si el folio fue anulado en el sistema (no llegó a emitirse). */
  anulado?: boolean;
  mntNeto?: number;
  mntIva?: number;
  mntExento?: number;
  /** Obligatorio en emitidos; prohibido en anulados. */
  mntTotal?: number;
  /** Tasa del documento; si se omite y hay IVA se declara 19. */
  tasaIva?: number;
}

/** Rango contiguo de folios. `final` se omite en rangos anulados de un solo folio. */
export interface RangoFolios {
  inicial: number;
  final?: number;
}

/** Contenido de un `<Resumen>` ya agregado por tipo de documento. */
export interface ResumenRcof {
  tipoDocumento: TipoDocumentoRcof;
  mntNeto?: number;
  mntIva?: number;
  tasaIva?: number;
  mntExento?: number;
  mntTotal: number;
  foliosEmitidos: number;
  foliosAnulados: number;
  foliosUtilizados: number;
  rangosUtilizados: RangoFolios[];
  rangosAnulados: RangoFolios[];
}

/** Datos de entrada para armar el archivo (caratula + documentos del período). */
export interface RcofParams {
  rutEmisor: string;
  rutEnvia: string;
  /** AAAA-MM-DD — resolución que autoriza el envío. */
  fchResol: string;
  nroResol: number;
  /** AAAA-MM-DD — primer día del resumen. */
  fchInicio: string;
  /** AAAA-MM-DD — último día del resumen. */
  fchFinal: string;
  /** Opcional en el XSD; correlativo dentro del día (0-999). */
  correlativo?: number;
  /** 1 en el primer envío; +1 por cada reenvío. Default 1. */
  secEnvio?: number;
  /** xs:ID de `<DocumentoConsumoFolios>`. Default: `RCOF_<epoch>`. */
  id?: string;
  documentos: DocumentoRcof[];
}

export interface RcofResultado {
  /** XML firmado (`<Signature>` hermana de `<DocumentoConsumoFolios>`). */
  xml: string;
  /** Serialización ISO-8859-1 lista para subir al SII. */
  bytes: Buffer;
  id: string;
  resumenes: ResumenRcof[];
}

export function esTipoRcof(tipo: number): tipo is TipoDocumentoRcof {
  return (TIPOS_RCOF as readonly number[]).includes(tipo);
}

function validarFecha(valor: string, campo: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new Error(`${campo} inválida (${valor}): se espera una fecha AAAA-MM-DD`);
  }
  const fecha = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
    throw new Error(`${campo} inválida (${valor}): no es una fecha real del calendario`);
  }
  return valor;
}

/** Normaliza a `12345678-K` (sin puntos, DV en mayúscula) como exige `RUTType`. */
function validarRut(valor: string, campo: string): string {
  try {
    const { numero, dv } = dividirRut(valor);
    return `${numero}-${dv}`;
  } catch {
    throw new Error(`${campo} inválido (${valor}): se espera un RUT con formato 12345678-9`);
  }
}

function validarEntero(valor: number, campo: string, min: number, max: number): number {
  if (!Number.isInteger(valor) || valor < min || valor > max) {
    throw new Error(`${campo} inválido (${valor}): se espera un entero entre ${min} y ${max}`);
  }
  return valor;
}

/** `MontoType` del SII es nonNegativeInteger: montos enteros, nunca negativos. */
function validarMonto(valor: number, campo: string): number {
  if (!Number.isFinite(valor)) {
    throw new Error(`${campo} inválido (${valor}): se espera un número`);
  }
  const redondeado = Math.round(valor);
  if (redondeado < 0) {
    throw new Error(
      `${campo} negativo (${valor}): el tipo MontoType del SII no acepta negativos; ` +
        'un descuento o nota se declara en su propio documento, no restando aquí',
    );
  }
  return redondeado;
}

/** Documento ya validado y con montos redondeados a enteros. */
interface DocumentoValidado {
  tipo: TipoDocumentoRcof;
  folio: number;
  anulado: boolean;
  mntNeto: number;
  mntIva: number;
  mntExento: number;
  mntTotal: number;
  tasaIva?: number;
}

function normalizarDocumento(doc: DocumentoRcof): DocumentoValidado {
  if (!esTipoRcof(doc.tipo)) {
    throw new Error(
      `Tipo ${doc.tipo} no admitido en el RCOF: ConsumoFolio_v10.xsd solo acepta ` +
        '39 (boleta), 41 (boleta exenta) y 61 (nota de crédito). ' +
        'Las facturas 33/34/52/56 se reportan por EnvioDTE, no por consumo de folios.',
    );
  }
  const folio = validarEntero(doc.folio, `Folio del tipo ${doc.tipo}`, 1, 9_999_999_999);

  if (doc.anulado) {
    const conMontos =
      doc.mntNeto !== undefined ||
      doc.mntIva !== undefined ||
      doc.mntExento !== undefined ||
      doc.mntTotal !== undefined ||
      doc.tasaIva !== undefined;
    if (conMontos) {
      throw new Error(
        `Folio ${folio} (tipo ${doc.tipo}) marcado anulado pero trae montos: ` +
          'un folio anulado en el sistema no emite documento y no suma al resumen',
      );
    }
    return { tipo: doc.tipo, folio, anulado: true, mntNeto: 0, mntIva: 0, mntExento: 0, mntTotal: 0 };
  }

  if (doc.mntTotal === undefined) {
    throw new Error(`Folio ${folio} (tipo ${doc.tipo}) emitido sin mntTotal: el total es obligatorio`);
  }
  const mntNeto = doc.mntNeto !== undefined ? validarMonto(doc.mntNeto, `MntNeto del folio ${folio}`) : 0;
  const mntIva = doc.mntIva !== undefined ? validarMonto(doc.mntIva, `MntIva del folio ${folio}`) : 0;
  const mntExento =
    doc.mntExento !== undefined ? validarMonto(doc.mntExento, `MntExento del folio ${folio}`) : 0;
  const mntTotal = validarMonto(doc.mntTotal, `MntTotal del folio ${folio}`);

  // Coherencia aritmética: el total del documento debe cerrar con su desglose.
  // Dejarlo pasar emitiría un resumen que no cuadra con los DTE del día.
  if (mntNeto + mntIva + mntExento !== mntTotal) {
    throw new Error(
      `Folio ${folio} (tipo ${doc.tipo}) no cuadra: neto ${mntNeto} + iva ${mntIva} + exento ${mntExento} ` +
        `!= total ${mntTotal}`,
    );
  }

  let tasaIva: number | undefined;
  if (doc.tasaIva !== undefined) {
    if (!Number.isFinite(doc.tasaIva) || doc.tasaIva <= 0 || doc.tasaIva > 999.99) {
      throw new Error(`TasaIVA inválida (${doc.tasaIva}) en folio ${folio}: PctType admite 0.01 a 999.99`);
    }
    tasaIva = doc.tasaIva;
  }

  return { tipo: doc.tipo, folio, anulado: false, mntNeto, mntIva, mntExento, mntTotal, tasaIva };
}

/** Agrupa folios ordenados ascendentemente en rangos contiguos [n, n+1, ...]. */
function rangosContiguos(folios: number[]): RangoFolios[] {
  const rangos: RangoFolios[] = [];
  let inicio = 0;
  let fin = 0;
  let abierto = false;
  for (const folio of folios) {
    if (abierto && folio === fin + 1) {
      fin = folio;
      continue;
    }
    if (abierto) rangos.push({ inicial: inicio, final: fin });
    inicio = folio;
    fin = folio;
    abierto = true;
  }
  if (abierto) rangos.push({ inicial: inicio, final: fin });
  return rangos;
}

function resumenDeTipo(tipo: TipoDocumentoRcof, docs: DocumentoValidado[]): ResumenRcof {
  const emitidos = docs.filter((d) => !d.anulado);
  const anulados = docs.filter((d) => d.anulado);
  const suma = (sel: (d: DocumentoValidado) => number): number =>
    emitidos.reduce((acumulado, d) => acumulado + sel(d), 0);

  const mntNeto = suma((d) => d.mntNeto);
  const mntIva = suma((d) => d.mntIva);
  const mntExento = suma((d) => d.mntExento);
  const mntTotal = suma((d) => d.mntTotal);

  const tasas = new Set(emitidos.map((d) => d.tasaIva).filter((t): t is number => t !== undefined));
  if (tasas.size > 1) {
    throw new Error(
      `Tipo ${tipo}: documentos con tasas de IVA distintas (${[...tasas].join(', ')}); ` +
        'el <Resumen> admite una sola <TasaIVA>',
    );
  }
  const tasaUnica = tasas.size === 1 ? [...tasas][0] : undefined;

  const foliosAnulados = anulados.map((d) => d.folio).sort((a, b) => a - b);
  return {
    tipoDocumento: tipo,
    ...(mntNeto > 0 ? { mntNeto } : {}),
    ...(mntIva > 0 ? { mntIva, tasaIva: tasaUnica ?? TASA_IVA_POR_DEFECTO } : {}),
    ...(mntExento > 0 ? { mntExento } : {}),
    mntTotal,
    foliosEmitidos: emitidos.length,
    foliosAnulados: anulados.length,
    foliosUtilizados: docs.length,
    rangosUtilizados: rangosContiguos(docs.map((d) => d.folio).sort((a, b) => a - b)),
    // RangoAnulados admite omitir <Final> cuando el rango es un solo folio (XSD minOccurs=0).
    rangosAnulados: rangosContiguos(foliosAnulados).map((r) =>
      r.final !== undefined && r.final !== r.inicial ? r : { inicial: r.inicial },
    ),
  };
}

/**
 * Agrega los documentos del período en los `<Resumen>` por tipo (39/41/61).
 * Rechaza explícitamente tipos fuera del enum, folios duplicados, anulados con
 * montos y documentos cuyo total no cuadra con el desglose.
 */
export function agregarResumenes(documentos: DocumentoRcof[]): ResumenRcof[] {
  if (documentos.length === 0) {
    throw new Error(
      'RCOF sin documentos: el XSD exige entre 1 y 3 <Resumen>, no hay folios que resumir',
    );
  }

  const porTipo = new Map<TipoDocumentoRcof, DocumentoValidado[]>();
  for (const doc of documentos) {
    const validado = normalizarDocumento(doc);
    const grupo = porTipo.get(validado.tipo);
    if (grupo) {
      if (grupo.some((d) => d.folio === validado.folio)) {
        throw new Error(
          `Folio ${validado.folio} duplicado en el tipo ${validado.tipo}: ` +
            'cada folio se consume una sola vez por período',
        );
      }
      grupo.push(validado);
    } else {
      porTipo.set(validado.tipo, [validado]);
    }
  }

  return [...porTipo.entries()].sort(([a], [b]) => a - b).map(([tipo, docs]) => resumenDeTipo(tipo, docs));
}

/** `<Resumen>` en el orden exacto de la secuencia del XSD. */
function resumenXml(resumen: ResumenRcof): string {
  const campos: string[] = [`<TipoDocumento>${resumen.tipoDocumento}</TipoDocumento>`];
  if (resumen.mntNeto !== undefined) campos.push(`<MntNeto>${resumen.mntNeto}</MntNeto>`);
  if (resumen.mntIva !== undefined) campos.push(`<MntIva>${resumen.mntIva}</MntIva>`);
  if (resumen.tasaIva !== undefined) campos.push(`<TasaIVA>${resumen.tasaIva}</TasaIVA>`);
  if (resumen.mntExento !== undefined) campos.push(`<MntExento>${resumen.mntExento}</MntExento>`);
  campos.push(`<MntTotal>${resumen.mntTotal}</MntTotal>`);
  campos.push(`<FoliosEmitidos>${resumen.foliosEmitidos}</FoliosEmitidos>`);
  campos.push(`<FoliosAnulados>${resumen.foliosAnulados}</FoliosAnulados>`);
  campos.push(`<FoliosUtilizados>${resumen.foliosUtilizados}</FoliosUtilizados>`);
  for (const rango of resumen.rangosUtilizados) {
    // En RangoUtilizados <Final> es obligatorio (XSD): rango de un folio repite el inicial.
    campos.push(
      `<RangoUtilizados><Inicial>${rango.inicial}</Inicial><Final>${rango.final ?? rango.inicial}</Final></RangoUtilizados>`,
    );
  }
  for (const rango of resumen.rangosAnulados) {
    campos.push(
      rango.final !== undefined && rango.final !== rango.inicial
        ? `<RangoAnulados><Inicial>${rango.inicial}</Inicial><Final>${rango.final}</Final></RangoAnulados>`
        : `<RangoAnulados><Inicial>${rango.inicial}</Inicial></RangoAnulados>`,
    );
  }
  return [`        <Resumen>`, ...campos.map((c) => `            ${c}`), '        </Resumen>'].join('\n');
}

function idPorDefecto(): string {
  return `RCOF_${Math.floor(Date.now() / 1000)}`;
}

/**
 * Arma el XML del RCOF sin firmar según ConsumoFolio_v10.xsd.
 * Falla explícitamente ante cualquier dato que el SII rechazaría.
 */
export function generarRcofXml(params: RcofParams): string {
  const rutEmisor = validarRut(params.rutEmisor, 'RutEmisor');
  const rutEnvia = validarRut(params.rutEnvia, 'RutEnvia');
  const fchResol = validarFecha(params.fchResol, 'FchResol');
  const nroResol = validarEntero(params.nroResol, 'NroResol', 0, 999_999);
  const fchInicio = validarFecha(params.fchInicio, 'FchInicio');
  const fchFinal = validarFecha(params.fchFinal, 'FchFinal');
  if (fchFinal < fchInicio) {
    throw new Error(`FchFinal (${fchFinal}) anterior a FchInicio (${fchInicio}): el período está invertido`);
  }
  const secEnvio = validarEntero(params.secEnvio ?? 1, 'SecEnvio', 1, 999);
  const id = params.id ?? idPorDefecto();
  if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(id)) {
    throw new Error(
      `ID inválido (${id}): xs:ID debe ser un NCName (empezar con letra o "_", sin espacios)`,
    );
  }
  const correlativo =
    params.correlativo !== undefined ? validarEntero(params.correlativo, 'Correlativo', 0, 999) : undefined;

  const resúmenes = agregarResumenes(params.documentos);

  return `<?xml version="1.0" encoding="ISO-8859-1"?>
<ConsumoFolios xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sii.cl/SiiDte ConsumoFolio_v10.xsd" version="1.0">
    <DocumentoConsumoFolios ID="${id}">
        <Caratula version="1.0">
            <RutEmisor>${rutEmisor}</RutEmisor>
            <RutEnvia>${rutEnvia}</RutEnvia>
            <FchResol>${fchResol}</FchResol>
            <NroResol>${nroResol}</NroResol>
            <FchInicio>${fchInicio}</FchInicio>
            <FchFinal>${fchFinal}</FchFinal>
${correlativo !== undefined ? `            <Correlativo>${correlativo}</Correlativo>\n` : ''}            <SecEnvio>${secEnvio}</SecEnvio>
            <TmstFirmaEnv>${timestampChile()}</TmstFirmaEnv>
        </Caratula>
${resúmenes.map(resumenXml).join('\n')}
    </DocumentoConsumoFolios>
</ConsumoFolios>`;
}

/**
 * Genera, firma y serializa el RCOF completo.
 *
 * La firma se compone con `SiiSigner.signXml`: firma `<DocumentoConsumoFolios>`
 * por local-name e inserta la `<Signature>` como hermana posterior, que es la
 * posición que exige la secuencia del XSD. xml-crypto toma el atributo `ID` del
 * elemento firmado y lo emite como `URI="#<ID>"` de la `<Reference>`.
 */
export function generarRcof(params: RcofParams, signer: SiiSigner): RcofResultado {
  const id = params.id ?? idPorDefecto();
  const xmlSinFirma = generarRcofXml({ ...params, id });
  const xml = signer.signXml(xmlSinFirma, 'DocumentoConsumoFolios');
  return {
    xml,
    bytes: bytesLatin1(xml, 'RCOF (Consumo de Folios)'),
    id,
    resumenes: agregarResumenes(params.documentos),
  };
}
