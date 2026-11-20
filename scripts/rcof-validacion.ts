#!/usr/bin/env node
/**
 * Harness de validación del módulo RCOF (Consumo de Folios) — gate offline.
 *
 * Genera un RCOF de ejemplo con datos ficticios (RUT 76123456-0, cinco boletas 39,
 * una boleta exenta 41 emitida y un folio 41 anulado), lo firma con el PFX de los
 * fixtures de dte-parity y lo valida contra el XSD oficial `ConsumoFolio_v10.xsd`
 * con el mismo mecanismo de dte-parity/scripts/validate-xsd.ts (java + Xerces del
 * JDK vía tools/ValidateXsd.java). Sin red, sin BD, sin SII.
 *
 * Chequeos:
 *   1. generacion       — rcof.ts genera, firma y serializa sin errores
 *   2. xsd-oficial      — PASS contra ConsumoFolio_v10.xsd
 *   3. encoding-latin1  — declaración ISO-8859-1, round-trip de bytes, archivo en disco
 *   4. firma-dsig       — <Signature> hermana, URI="#<ID>", verificación criptográfica
 *   5. caratula         — SecEnvio=1 y campos de carátula correctos
 *   6. orden-xsd        — secuencia de elementos según el XSD
 *   7. agregacion       — resúmenes, montos y rangos esperados
 *   8. rechazos         — errores explícitos (tipo 33, duplicados, montos, fechas)
 *
 * Uso:
 *   cd C:\Users\Blaz Baez\Desktop\E-commerce Project\austral-market-next
 *   npx tsx scripts/rcof-validacion.ts
 *
 * Exit code 0 si todo pasa; 1 si hay algún FAIL.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import iconv from 'iconv-lite';
import { SignedXml } from 'xml-crypto';

import { SiiSigner } from '../src/lib/sii/signer';
import {
  agregarResumenes,
  generarRcof,
  generarRcofXml,
  type DocumentoRcof,
  type RcofParams,
  type RcofResultado,
  type ResumenRcof,
} from '../src/lib/sii/rcof';

const ROOT = path.join(__dirname, '..');
const PARITY = path.join(ROOT, '..', 'dte-parity');
const VALIDADOR_JAVA = path.join(PARITY, 'tools', 'ValidateXsd.java');
const SCHEMA_RCOF = path.join(PARITY, 'schemas', 'ConsumoFolio_v10.xsd');
const PFX = path.join(PARITY, 'fixtures', 'emisor.pfx');
/** Contraseña del fixture, ver dte-parity/fixtures/make-fixtures.ts. */
const PFX_PASSWORD = 'prueba123';
const OUT_DIR = path.join(ROOT, 'pruebas-local', 'rcof');
const XML_PATH = path.join(OUT_DIR, 'rcof-ejemplo.xml');

// ---------------------------------------------------------------------------
// Datos ficticios del ejemplo
// ---------------------------------------------------------------------------

const DOCUMENTOS: DocumentoRcof[] = [
  // Boletas 39: cinco folios consecutivos emitidos (1001-1005), neto 1.000 + IVA 190.
  ...[1001, 1002, 1003, 1004, 1005].map((folio) => ({
    tipo: 39,
    folio,
    mntNeto: 1000,
    mntIva: 190,
    mntTotal: 1190,
    tasaIva: 19,
  })),
  // Boleta exenta 41: folio 2001 emitido (5.000 exento) y folio 2002 anulado en sistema.
  { tipo: 41, folio: 2001, mntExento: 5000, mntTotal: 5000 },
  { tipo: 41, folio: 2002, anulado: true },
];

const PARAMS: RcofParams = {
  rutEmisor: '76123456-0',
  rutEnvia: '11111111-1',
  fchResol: '2025-03-14',
  nroResol: 1234,
  fchInicio: '2026-11-15',
  fchFinal: '2026-11-15',
  secEnvio: 1,
  id: 'RCOF_PRUEBA_1',
  documentos: DOCUMENTOS,
};

const RESUMENES_ESPERADOS: ResumenRcof[] = [
  {
    tipoDocumento: 39,
    mntNeto: 5000,
    mntIva: 950,
    tasaIva: 19,
    mntTotal: 5950,
    foliosEmitidos: 5,
    foliosAnulados: 0,
    foliosUtilizados: 5,
    rangosUtilizados: [{ inicial: 1001, final: 1005 }],
    rangosAnulados: [],
  },
  {
    tipoDocumento: 41,
    mntExento: 5000,
    mntTotal: 5000,
    foliosEmitidos: 1,
    foliosAnulados: 1,
    foliosUtilizados: 2,
    rangosUtilizados: [{ inicial: 2001, final: 2002 }],
    rangosAnulados: [{ inicial: 2002 }],
  },
];

// ---------------------------------------------------------------------------
// Utilidades del harness
// ---------------------------------------------------------------------------

function afirmar(condicion: boolean, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(mensaje);
}

function iguales(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const clavesA = Object.keys(a as Record<string, unknown>);
  const clavesB = Object.keys(b as Record<string, unknown>);
  if (clavesA.length !== clavesB.length) return false;
  return clavesA.every((clave) =>
    iguales((a as Record<string, unknown>)[clave], (b as Record<string, unknown>)[clave]),
  );
}

/** Mismo despacho que dte-parity/scripts/validate-xsd.ts: java + ValidateXsd.java. */
function validarConXsd(xmlPath: string, schemaPath: string): string {
  try {
    return execFileSync('java', [VALIDADOR_JAVA, xmlPath, schemaPath], { encoding: 'utf8' }).trim();
  } catch (error) {
    const salida = (error as { stdout?: string }).stdout;
    if (typeof salida === 'string' && salida.trim()) return salida.trim();
    return `FAIL ${(error as Error).message}`;
  }
}

/** Certificado base64 DER -> PEM para xml-crypto (igual que validate-xsd.ts). */
function pemDeCertificado(base64Der: string): string {
  const cuerpo = base64Der.match(/.{1,64}/g)?.join('\n') ?? base64Der;
  return `-----BEGIN CERTIFICATE-----\n${cuerpo}\n-----END CERTIFICATE-----`;
}

/** Todas las etiquetas deben aparecer, en este orden. */
function secuenciaEnOrden(texto: string, etiquetas: string[], contexto: string): void {
  let anterior = -1;
  for (const etiqueta of etiquetas) {
    const indice = texto.indexOf(etiqueta);
    afirmar(indice >= 0, `${contexto}: falta ${etiqueta}`);
    afirmar(indice > anterior, `${contexto}: ${etiqueta} fuera de orden respecto a la secuencia del XSD`);
    anterior = indice;
  }
}

/** Las etiquetas presentes deben aparecer en este orden (las opcionales pueden faltar). */
function subsecuenciaEnOrden(texto: string, etiquetas: string[], contexto: string): void {
  let anterior = -1;
  for (const etiqueta of etiquetas) {
    const indice = texto.indexOf(etiqueta);
    if (indice < 0) continue;
    afirmar(indice > anterior, `${contexto}: ${etiqueta} fuera de orden respecto a la secuencia del XSD`);
    anterior = indice;
  }
}

function mensajeDe(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

// ---------------------------------------------------------------------------
// Chequeos
// ---------------------------------------------------------------------------

interface Resultado {
  nombre: string;
  ok: boolean;
  detalle: string;
}

const resultados: Resultado[] = [];

function chequeo(nombre: string, fn: () => string): void {
  try {
    const detalle = fn();
    resultados.push({ nombre, ok: true, detalle });
    console.log(`PASS  ${nombre.padEnd(16)} — ${detalle}`);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    resultados.push({ nombre, ok: false, detalle });
    console.log(`FAIL  ${nombre.padEnd(16)} — ${detalle}`);
  }
}

function main(): number {
  console.log('🧪 Validación RCOF (Consumo de Folios) contra ConsumoFolio_v10.xsd\n');

  for (const [nombre, ruta] of [
    ['validador Java', VALIDADOR_JAVA],
    ['XSD oficial', SCHEMA_RCOF],
    ['PFX de prueba', PFX],
  ] as Array<[string, string]>) {
    if (!fs.existsSync(ruta)) {
      console.error(`FAIL  pre-requisito      — no existe ${nombre}: ${ruta}`);
      return 1;
    }
  }
  try {
    execFileSync('java', ['-version'], { stdio: 'pipe' });
  } catch {
    console.error('FAIL  pre-requisito      — java no está disponible en PATH (necesario para ValidateXsd.java)');
    return 1;
  }

  let signer: SiiSigner | null = null;
  let rcof: RcofResultado | null = null;

  // La generación va fuera de `chequeo` a propósito: TypeScript no sigue las
  // asignaciones a un `let` capturado cuando ocurren dentro de un callback.
  try {
    signer = new SiiSigner(fs.readFileSync(PFX), PFX_PASSWORD);
    rcof = generarRcof(PARAMS, signer);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(XML_PATH, rcof.bytes);
    const detalle = `${rcof.bytes.length} bytes ISO-8859-1, ID=${rcof.id} → ${path.relative(ROOT, XML_PATH)}`;
    resultados.push({ nombre: 'generacion', ok: true, detalle });
    console.log(`PASS  ${'generacion'.padEnd(16)} — ${detalle}`);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    resultados.push({ nombre: 'generacion', ok: false, detalle });
    console.log(`FAIL  ${'generacion'.padEnd(16)} — ${detalle}`);
  }

  if (signer === null || rcof === null) {
    return resumen();
  }
  const generado = rcof;
  const emisorFirmado = signer;
  const xml = generado.xml;

  chequeo('xsd-oficial', () => {
    const salida = validarConXsd(XML_PATH, SCHEMA_RCOF);
    afirmar(salida.startsWith('PASS'), `Xerces rechazó el documento: ${salida}`);
    return `ConsumoFolio_v10.xsd → ${salida}`;
  });

  chequeo('encoding-latin1', () => {
    afirmar(
      xml.startsWith('<?xml version="1.0" encoding="ISO-8859-1"?>'),
      'el XML no declara encoding="ISO-8859-1"',
    );
    const fueraDeCharset = [...xml].filter((c) => (c.codePointAt(0) ?? 0) > 0xff);
    afirmar(
      fueraDeCharset.length === 0,
      `hay ${fueraDeCharset.length} caracteres fuera de ISO-8859-1 (ej. ${fueraDeCharset[0]})`,
    );
    const roundTrip = iconv.decode(generado.bytes, 'ISO-8859-1');
    afirmar(roundTrip === xml, 'el round-trip ISO-8859-1 de los bytes no devuelve el XML firmado');
    const enDisco = fs.readFileSync(XML_PATH);
    afirmar(enDisco.equals(generado.bytes), 'el archivo escrito en disco no coincide con los bytes generados');
    return `declaración ISO-8859-1 + round-trip iconv + archivo en disco (${generado.bytes.length} bytes, todos <= 0xFF)`;
  });

  chequeo('firma-dsig', () => {
    const firmas = xml.match(/<Signature[\s>]/g) ?? [];
    afirmar(firmas.length === 1, `se esperaban 1 <Signature> y hay ${firmas.length}`);
    afirmar(
      xml.includes('<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">'),
      'falta <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">',
    );
    afirmar(xml.includes(`URI="#${generado.id}"`), `la <Reference> no apunta a URI="#${generado.id}"`);
    const trasDocumento = xml.indexOf('</DocumentoConsumoFolios>');
    const firma = xml.indexOf('<Signature');
    afirmar(firma > trasDocumento, 'la <Signature> no es hermana posterior de <DocumentoConsumoFolios>');
    afirmar(xml.indexOf('</ConsumoFolios>') > firma, 'la <Signature> quedó fuera de la raíz <ConsumoFolios>');

    const firmaXml = xml.match(/<Signature[\s\S]*<\/Signature>/)?.[0];
    afirmar(firmaXml !== undefined, 'no se pudo extraer el bloque <Signature>');
    const verificador = new SignedXml({ publicCert: pemDeCertificado(emisorFirmado.getCertificatePem()) });
    verificador.loadSignature(firmaXml);
    afirmar(verificador.checkSignature(xml), 'la verificación criptográfica de la firma falló');
    return `1 firma envolvente sobre #${generado.id}, digest y SignatureValue verificados con xml-crypto`;
  });

  chequeo('caratula', () => {
    const esperados = [
      '<RutEmisor>76123456-0</RutEmisor>',
      '<RutEnvia>11111111-1</RutEnvia>',
      '<FchResol>2025-03-14</FchResol>',
      '<NroResol>1234</NroResol>',
      '<FchInicio>2026-11-15</FchInicio>',
      '<FchFinal>2026-11-15</FchFinal>',
      '<SecEnvio>1</SecEnvio>',
      '<Caratula version="1.0">',
    ];
    for (const esperado of esperados) {
      afirmar(xml.includes(esperado), `falta ${esperado}`);
    }
    afirmar(
      /<TmstFirmaEnv>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}<\/TmstFirmaEnv>/.test(xml),
      'TmstFirmaEnv no tiene formato xs:dateTime AAAA-MM-DDTHH:MM:SS (hora Chile)',
    );
    afirmar(
      xml.includes('xsi:schemaLocation="http://www.sii.cl/SiiDte ConsumoFolio_v10.xsd" version="1.0">'),
      'la raíz <ConsumoFolios> no lleva version="1.0"',
    );
    afirmar(xml.includes('<DocumentoConsumoFolios ID="RCOF_PRUEBA_1">'), 'falta el atributo ID en <DocumentoConsumoFolios>');
    return 'RutEmisor/RutEnvia/FchResol/NroResol/FchInicio/FchFinal correctos, SecEnvio=1, TmstFirmaEnv en hora Chile';
  });

  chequeo('orden-xsd', () => {
    secuenciaEnOrden(
      xml,
      [
        '<ConsumoFolios',
        '<DocumentoConsumoFolios ID=',
        '<Caratula',
        '</Caratula>',
        '<Resumen>',
        '</DocumentoConsumoFolios>',
        '<Signature',
        '</ConsumoFolios>',
      ],
      'raíz',
    );
    secuenciaEnOrden(
      xml,
      [
        '<Caratula version="1.0">',
        '<RutEmisor>',
        '<RutEnvia>',
        '<FchResol>',
        '<NroResol>',
        '<FchInicio>',
        '<FchFinal>',
        '<SecEnvio>',
        '<TmstFirmaEnv>',
        '</Caratula>',
      ],
      'Caratula',
    );
    const bloques = xml.match(/<Resumen>[\s\S]*?<\/Resumen>/g) ?? [];
    afirmar(bloques.length === 2, `se esperaban 2 <Resumen> y hay ${bloques.length}`);
    bloques.forEach((bloque: string, i: number) => {
      const contexto = `Resumen[${i}]`;
      subsecuenciaEnOrden(
        bloque,
        [
          '<TipoDocumento>',
          '<MntNeto>',
          '<MntIva>',
          '<TasaIVA>',
          '<MntExento>',
          '<MntTotal>',
          '<FoliosEmitidos>',
          '<FoliosAnulados>',
          '<FoliosUtilizados>',
          '<RangoUtilizados>',
          '<RangoAnulados>',
        ],
        contexto,
      );
      if (bloque.includes('<RangoUtilizados>') && bloque.includes('<RangoAnulados>')) {
        afirmar(
          bloque.lastIndexOf('<RangoUtilizados>') < bloque.indexOf('<RangoAnulados>'),
          `${contexto}: hay <RangoAnulados> antes de terminar los <RangoUtilizados>`,
        );
      }
      const rangos = bloque.match(/<Rango(Utilizados|Anulados)>([\s\S]*?)<\/Rango\1>/g) ?? [];
      for (const rango of rangos) {
        subsecuenciaEnOrden(rango, ['<Inicial>', '<Final>'], `${contexto} rango`);
      }
    });
    return 'secuencia de raíz, Caratula, 2 Resumen y rangos coincide con el orden del XSD';
  });

  chequeo('agregacion', () => {
    afirmar(
      iguales(generado.resumenes, RESUMENES_ESPERADOS),
      `los resúmenes no coinciden con lo esperado: ${JSON.stringify(generado.resumenes)}`,
    );
    const esperados = [
      // Tipo 39: 5 emitidos, rango contiguo 1001-1005, neto+iva.
      '<TipoDocumento>39</TipoDocumento>',
      '<MntNeto>5000</MntNeto>',
      '<MntIva>950</MntIva>',
      '<TasaIVA>19</TasaIVA>',
      '<MntTotal>5950</MntTotal>',
      '<FoliosEmitidos>5</FoliosEmitidos>',
      '<FoliosAnulados>0</FoliosAnulados>',
      '<FoliosUtilizados>5</FoliosUtilizados>',
      '<RangoUtilizados><Inicial>1001</Inicial><Final>1005</Final></RangoUtilizados>',
      // Tipo 41: 1 emitido + 1 anulado, solo exento, RangoAnulados de un folio sin <Final>.
      '<TipoDocumento>41</TipoDocumento>',
      '<MntExento>5000</MntExento>',
      '<MntTotal>5000</MntTotal>',
      '<FoliosEmitidos>1</FoliosEmitidos>',
      '<FoliosAnulados>1</FoliosAnulados>',
      '<FoliosUtilizados>2</FoliosUtilizados>',
      '<RangoUtilizados><Inicial>2001</Inicial><Final>2002</Final></RangoUtilizados>',
      '<RangoAnulados><Inicial>2002</Inicial></RangoAnulados>',
    ];
    for (const esperado of esperados) {
      afirmar(xml.includes(esperado), `falta ${esperado} en el XML`);
    }
    const bloque41 = (xml.match(/<Resumen>[\s\S]*?<\/Resumen>/g) ?? [])[1] ?? '';
    for (const prohibido of ['<MntNeto>', '<MntIva>', '<TasaIVA>']) {
      afirmar(!bloque41.includes(prohibido), `el resumen 41 no debe llevar ${prohibido} (boleta exenta sin IVA)`);
    }
    return 'tipo 39: 5 emitidos (1001-1005) neto 5000 + iva 950 + tasa 19; tipo 41: 1 emitido + 1 anulado (2002), exento 5000';
  });

  chequeo('rechazos', () => {
    const casos: Array<{ nombre: string; esperado: string; fn: () => unknown }> = [
      {
        nombre: 'tipo 33 fuera del enum',
        esperado: 'no admitido en el RCOF',
        fn: () => agregarResumenes([{ tipo: 33, folio: 100, mntNeto: 840, mntIva: 160, mntTotal: 1000 }]),
      },
      {
        nombre: 'folio duplicado',
        esperado: 'duplicado',
        fn: () =>
          agregarResumenes([
            { tipo: 39, folio: 1001, mntNeto: 1000, mntIva: 190, mntTotal: 1190 },
            { tipo: 39, folio: 1001, mntNeto: 1000, mntIva: 190, mntTotal: 1190 },
          ]),
      },
      {
        nombre: 'anulado con montos',
        esperado: 'anulado pero trae montos',
        fn: () => agregarResumenes([{ tipo: 41, folio: 7, anulado: true, mntTotal: 1000 }]),
      },
      {
        nombre: 'total que no cuadra',
        esperado: 'no cuadra',
        fn: () => agregarResumenes([{ tipo: 39, folio: 8, mntNeto: 1000, mntIva: 190, mntTotal: 9999 }]),
      },
      {
        nombre: 'período sin documentos',
        esperado: 'sin documentos',
        fn: () => agregarResumenes([]),
      },
      {
        nombre: 'SecEnvio 0',
        esperado: 'SecEnvio inválido',
        fn: () => generarRcofXml({ ...PARAMS, secEnvio: 0 }),
      },
      {
        nombre: 'FchFinal anterior a FchInicio',
        esperado: 'anterior a FchInicio',
        fn: () => generarRcofXml({ ...PARAMS, fchFinal: '2026-11-14' }),
      },
      {
        nombre: 'monto negativo',
        esperado: 'negativo',
        fn: () => agregarResumenes([{ tipo: 39, folio: 9, mntNeto: -1000, mntIva: 0, mntTotal: -1000 }]),
      },
    ];
    for (const caso of casos) {
      const mensaje = mensajeDe(caso.fn);
      afirmar(mensaje !== null, `${caso.nombre}: no lanzó ningún error`);
      afirmar(mensaje.includes(caso.esperado), `${caso.nombre}: mensaje inesperado "${mensaje}"`);
    }
    return `${casos.length} entradas inválidas rechazadas con mensaje explícito`;
  });

  return resumen();
}

function resumen(): number {
  const pasaron = resultados.filter((r) => r.ok).length;
  console.log(`\nResultado: ${pasaron}/${resultados.length} PASS`);
  if (pasaron < resultados.length) {
    console.log('\nFAIL detalle:');
    for (const r of resultados.filter((x) => !x.ok)) {
      console.log(`  - ${r.nombre}: ${r.detalle}`);
    }
    return 1;
  }
  console.log(`\n📁 RCOF de ejemplo: ${path.relative(ROOT, XML_PATH)}`);
  return 0;
}

process.exit(main());
