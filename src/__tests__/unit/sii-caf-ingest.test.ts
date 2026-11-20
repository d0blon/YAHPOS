import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizarRutEmisor, SiiCafParser, type CafData } from '@/lib/sii/caf';
import { ingestarCaf, type IngestarCafResultado } from '@/lib/sii/caf-ingest';
import { esPosibleCaf, wizardCafSchema } from '@/lib/validations/sii';
import * as cafStore from '@/lib/sii/caf-store';

jest.mock('server-only', () => ({}), { virtual: true });

const STORE = '11111111-1111-4111-8111-111111111111';
const FA = '2026-01-01';
const RE = '76.123.456-0';
const RS = 'COMERCIAL SINTETICA SPA';

interface ErrorDb {
  message: string;
}

interface EstadoDb {
  config: Record<string, unknown> | null;
  configError: ErrorDb | null;
  folio: Record<string, unknown> | null;
  folioError: ErrorDb | null;
  configWriteError: ErrorDb | null;
  guardarError: ErrorDb | null;
}

interface OpcionesCaf {
  re?: string;
  rs?: string;
  td?: number | string;
  desde?: number | string;
  hasta?: number | string;
  fa?: string;
  conPrefijo?: boolean;
  conAutorizacion?: boolean;
  conPemFalso?: boolean;
}

function xmlCaf(opciones: OpcionesCaf = {}): string {
  const p = opciones.conPrefijo ? 's:' : '';
  const xmlns = opciones.conPrefijo ? ' xmlns:s="urn:sii:sintetico"' : '';
  const re = opciones.re ?? RE;
  const rs = opciones.rs ?? RS;
  const td = opciones.td ?? 39;
  const desde = opciones.desde ?? 1;
  const hasta = opciones.hasta ?? 10;
  const fa = opciones.fa ?? FA;
  const raiz = opciones.conAutorizacion === false ? `${p}DTE` : `${p}AUTORIZACION`;
  const rsask = opciones.conPemFalso
    ? '-----BEGIN PRIVATE KEY-----\nCLAVE-SINTETICA-NO-REAL\n-----END PRIVATE KEY-----'
    : '<M>SlNTXVRJQw==</M><E>AQAB</E><D>SlNTXVRJQw==</D>';

  const fragmento =
    `<${p}CAF version="1.0" ID="CAF-SINTETICO">\n` +
    `  <${p}DA>\n` +
    `    <${p}RE>${re}</${p}RE>\n` +
    `    <${p}RS>${rs}</${p}RS>\n` +
    `    <${p}TD>${td}</${p}TD>\n` +
    `    <${p}RNG><${p}D>${desde}</${p}D><${p}H>${hasta}</${p}H></${p}RNG>\n` +
    `    <${p}FA>${fa}</${p}FA>\n` +
    `    <${p}RSAPK><${p}M>SlNTXVRJQw==</${p}M><${p}E>AQAB</${p}E></${p}RSAPK>\n` +
    `  </${p}DA>\n` +
    `</${p}CAF>`;

  return (
    `<?xml version="1.0" encoding="ISO-8859-1"?>\n` +
    `<${raiz}${xmlns}>\n${fragmento}\n` +
    `<${p}RSASK>${rsask}</${p}RSASK>\n` +
    `</${raiz}>`
  );
}

/** Extrae el fragmento por separado para comparar bytes, sin depender del parser. */
function fragmentoEsperado(xml: string, conPrefijo: boolean): string {
  const prefijo = conPrefijo ? 's:' : '';
  const inicio = xml.indexOf(`<${prefijo}CAF `);
  const fin = xml.indexOf(`</${prefijo}CAF>`, inicio) + `</${prefijo}CAF>`.length;
  return xml.slice(inicio, fin);
}

function datosOk(resultado: IngestarCafResultado) {
  if (!resultado.ok) {
    throw new Error(`Se esperaba ok, se recibió ${resultado.code}: ${resultado.error}`);
  }
  return resultado.data;
}

function datosFallo(resultado: IngestarCafResultado, code: string) {
  expect(resultado.ok).toBe(false);
  if (resultado.ok) throw new Error('Se esperaba un fallo');
  expect(resultado.code).toBe(code);
  return resultado;
}

let db: EstadoDb;
let knexUpsert: jest.Mock;
let knexUpdate: jest.Mock;
let knexInsert: jest.Mock;
let configMaybeSingle: jest.Mock;
let folioMaybeSingle: jest.Mock;
let fromMock: jest.Mock;
let supabase: SupabaseClient;

beforeEach(() => {
  db = {
    config: { rut_emisor: '', razon_social: '' },
    configError: null,
    folio: null,
    folioError: null,
    configWriteError: null,
    guardarError: null,
  };

  knexUpsert = jest.fn(async () => ({ error: db.guardarError }));
  knexUpdate = jest.fn(() => ({
    eq: jest.fn(async () => ({ error: db.configWriteError })),
  }));
  knexInsert = jest.fn(async () => ({ error: db.configWriteError }));
  configMaybeSingle = jest.fn(async () => ({ data: db.config, error: db.configError }));
  folioMaybeSingle = jest.fn(async () => ({ data: db.folio, error: db.folioError }));

  fromMock = jest.fn((tabla: string) => {
    if (tabla === 'sii_config') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({ maybeSingle: configMaybeSingle })),
        })),
        update: knexUpdate,
        insert: knexInsert,
      };
    }
    if (tabla === 'sii_folios') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({ maybeSingle: folioMaybeSingle })),
            })),
          })),
        })),
        upsert: knexUpsert,
      };
    }
    throw new Error(`Tabla inesperada: ${tabla}`);
  });

  supabase = { from: fromMock } as unknown as SupabaseClient;
});

afterEach(() => {
  jest.restoreAllMocks();
});

function ingestar(xml = xmlCaf(), storeId = STORE) {
  return ingestarCaf({ supabase, storeId, xml });
}

function payloadUpsert(): Record<string, unknown> {
  expect(knexUpsert).toHaveBeenCalledTimes(1);
  return knexUpsert.mock.calls[0][0] as Record<string, unknown>;
}

describe('ingesta general de CAF — parser y validación de archivo', () => {
  it('CAF con namespaces: parsea y el fragmento <CAF> extraído conserva bytes exactos', () => {
    const xml = xmlCaf({ conPrefijo: true });
    const datos: CafData = SiiCafParser.parse(xml);

    expect(datos.rut).toBe(RE);
    expect(datos.tipoDte).toBe(39);
    expect(datos.desde).toBe(1);
    expect(datos.hasta).toBe(10);
    expect(datos.fecha).toBe(FA);
    expect(datos.razonSocial).toBe(RS);
    expect(datos.xmlCompleto).toBe(xml);
    expect(datos.cafFragment).toBe(fragmentoEsperado(xml, true));
    expect(datos.cafFragment).toContain('<s:RE>');
    expect(datos.cafFragment).not.toContain('<s:RSASK>');
  });

  it.each([
    ['caf.dat', 'application/octet-stream'],
    ['CAF', ''],
    ['caf.xml', 'text/xml'],
    ['caf.dat', 'text/plain'],
  ])('wizardCafSchema acepta %s con MIME %s según tamaño', (nombre, mime) => {
    const caf = new File([new Uint8Array(256)], nombre, { type: mime });

    expect(esPosibleCaf(caf)).toBe(true);
    expect(wizardCafSchema.safeParse({ caf, tipoDte: 39 }).success).toBe(true);
    expect(wizardCafSchema.safeParse({ caf }).success).toBe(true);
  });

  it('wizardCafSchema rechaza archivos mayores a 10MB', () => {
    const caf = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'caf.dat', {
      type: 'application/octet-stream',
    });

    expect(esPosibleCaf(caf)).toBe(false);
    const resultado = wizardCafSchema.safeParse({ caf, tipoDte: 39 });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(JSON.stringify(resultado.error.issues)).toContain('10MB');
    }
  });
});

describe('ingesta general de CAF — configuración del emisor', () => {
  it('config con RUT vacío: escribe rut_emisor y razon_social del CAF', async () => {
    db.config = { rut_emisor: '', razon_social: '' };

    const datos = datosOk(await ingestar());

    expect(knexUpdate).toHaveBeenCalledWith({ rut_emisor: '76123456-0', razon_social: RS });
    expect(knexInsert).not.toHaveBeenCalled();
    expect(datos.rutEmisor).toBe('76123456-0');
  });

  it('config con RUT vacío y razón social ya presente: sólo escribe el RUT', async () => {
    db.config = { rut_emisor: null, razon_social: 'RAZON PREEXISTENTE' };

    datosOk(await ingestar());

    expect(knexUpdate).toHaveBeenCalledWith({ rut_emisor: '76123456-0' });
  });

  it('config inexistente: inserta store_id, rut_emisor y razon_social', async () => {
    db.config = null;

    datosOk(await ingestar());

    expect(knexInsert).toHaveBeenCalledWith({
      store_id: STORE,
      rut_emisor: '76123456-0',
      razon_social: RS,
    });
    expect(knexUpdate).not.toHaveBeenCalled();
  });

  it('RUT configurado distinto: CAF-RUT sin escribir nada', async () => {
    db.config = { rut_emisor: '77.123.456-7', razon_social: 'OTRO EMISOR' };

    const r = datosFallo(await ingestar(), 'CAF-RUT');

    expect(r.details).toContain('CAF 76123456-0 vs configurado 77123456-7');
    expect(knexUpdate).not.toHaveBeenCalled();
    expect(knexInsert).not.toHaveBeenCalled();
    expect(knexUpsert).not.toHaveBeenCalled();
  });

  it('RUT con ceros a la izquierda y DV minúscula: normalización coherente, sin CAF-RUT', async () => {
    const reCaf = '00761234-k';
    const reConfig = '0.761.234-K';
    db.config = { rut_emisor: reConfig, razon_social: RS };

    expect(normalizarRutEmisor(reCaf)).toBe('761234-K');
    expect(normalizarRutEmisor(reConfig)).toBe('761234-K');

    const datos = datosOk(await ingestar(xmlCaf({ re: reCaf })));

    expect(datos.rutEmisor).toBe('761234-K');
    expect(knexUpdate).not.toHaveBeenCalled();
    expect(knexInsert).not.toHaveBeenCalled();
  });

  it('CAF-CONFIG-LEER: falla la lectura de sii_config', async () => {
    db.configError = { message: 'permission denied for table sii_config' };

    datosFallo(await ingestar(), 'CAF-CONFIG-LEER');

    expect(knexUpsert).not.toHaveBeenCalled();
  });

  it('CAF-CONFIG-GUARDAR: falla el update de sii_config', async () => {
    db.configWriteError = { message: 'update denied' };

    datosFallo(await ingestar(), 'CAF-CONFIG-GUARDAR');

    expect(knexUpsert).not.toHaveBeenCalled();
  });

  it('CAF-CONFIG-GUARDAR: falla el insert de sii_config', async () => {
    db.config = null;
    db.configWriteError = { message: 'insert denied' };

    datosFallo(await ingestar(), 'CAF-CONFIG-GUARDAR');

    expect(knexUpsert).not.toHaveBeenCalled();
  });
});

describe('ingesta general de CAF — folios y fechas', () => {
  it('primera carga: folio_actual=desde, activo=true y reutilizado=false', async () => {
    db.folio = null;

    const datos = datosOk(await ingestar());

    expect(payloadUpsert()).toMatchObject({
      store_id: STORE,
      tipo_dte: 39,
      folio_desde: 1,
      folio_hasta: 10,
      folio_actual: 1,
      fecha_autorizacion: FA,
      activo: true,
    });
    expect(datos).toEqual({
      tipoDte: 39,
      folioDesde: 1,
      folioHasta: 10,
      totalFolios: 10,
      rutEmisor: '76123456-0',
      fechaAutorizacion: FA,
      reutilizado: false,
    });
  });

  it('re-subida del mismo CAF: conserva folio_actual y activo, devuelve reutilizado=true', async () => {
    db.folio = { folio_actual: 137, activo: false };

    const datos = datosOk(await ingestar());

    expect(payloadUpsert()).toMatchObject({
      folio_actual: 137,
      activo: false,
      folio_desde: 1,
      folio_hasta: 10,
    });
    expect(datos.reutilizado).toBe(true);
    expect(datos.totalFolios).toBe(10);
  });

  it('re-subida con folio_actual inválido: cae al folio inicial', async () => {
    db.folio = { folio_actual: 'no-numero', activo: true };

    datosOk(await ingestar());

    expect(payloadUpsert()).toMatchObject({ folio_actual: 1, activo: true });
  });

  it('fecha_autorizacion siempre se escribe en el upsert', async () => {
    const fecha = '2025-07-15';

    await ingestar(xmlCaf({ fa: fecha }));
    expect(payloadUpsert()).toMatchObject({ fecha_autorizacion: fecha });

    knexUpsert.mockClear();
    db.folio = { folio_actual: 4, activo: true };
    await ingestar(xmlCaf({ fa: fecha, desde: 2, hasta: 20 }));
    expect(payloadUpsert()).toMatchObject({ fecha_autorizacion: fecha });
  });

  it('CAF-FOLIOS-LEER: falla la consulta de sii_folios', async () => {
    db.folioError = { message: 'select denied' };

    datosFallo(await ingestar(), 'CAF-FOLIOS-LEER');

    expect(knexUpsert).not.toHaveBeenCalled();
  });

  it('CAF-FOLIOS-GUARDAR: falla el upsert de sii_folios', async () => {
    db.guardarError = { message: 'upsert denied' };

    datosFallo(await ingestar(), 'CAF-FOLIOS-GUARDAR');

    expect(payloadUpsert()).toMatchObject({ folio_desde: 1 });
  });

  it('CAF-CIFRADO: falla el cifrado del CAF y no se hace upsert', async () => {
    jest.spyOn(cafStore, 'encodeCaf').mockImplementation(() => {
      throw new Error('SII_ENCRYPTION_KEY rota');
    });

    datosFallo(await ingestar(), 'CAF-CIFRADO');

    expect(knexUpsert).not.toHaveBeenCalled();
  });
});

describe('ingesta general de CAF — fail-closed y redacción', () => {
  it('FA inválida en el XML: el parser la rechaza y la ingesta devuelve CAF-XML', async () => {
    const r = datosFallo(await ingestar(xmlCaf({ fa: '15-01-2026' })), 'CAF-XML');

    expect(r.details).toContain('AUTORIZACION/CAF/DA');
    expect(knexUpsert).not.toHaveBeenCalled();
  });

  it('FA inválida que llega a la ingesta: CAF-FA (rama comprobada con doble del parser)', async () => {
    const xml = xmlCaf();
    const caf = SiiCafParser.parse(xml);
    const spy = jest
      .spyOn(SiiCafParser, 'parse')
      .mockReturnValue({ ...caf, fecha: '15-01-2026' });

    const r = datosFallo(await ingestar(xml), 'CAF-FA');

    expect(spy).toHaveBeenCalledWith(xml);
    expect(r.details).toContain('AAAA-MM-DD');
    expect(knexUpsert).not.toHaveBeenCalled();
  });

  it('tipo DTE no permitido: CAF-TIPO sin escrituras', async () => {
    const r = datosFallo(await ingestar(xmlCaf({ td: 99 })), 'CAF-TIPO');

    expect(r.error).toContain('99');
    expect(knexUpdate).not.toHaveBeenCalled();
    expect(knexInsert).not.toHaveBeenCalled();
    expect(knexUpsert).not.toHaveBeenCalled();
  });

  it.each([
    [10, 5],
    [0, 10],
  ])('rango inválido %i-%i: CAF-RANGO', async (desde, hasta) => {
    const r = datosFallo(await ingestar(xmlCaf({ desde, hasta })), 'CAF-RANGO');

    expect(r.details).toContain(`${desde}-${hasta}`);
    expect(knexUpsert).not.toHaveBeenCalled();
  });

  it('XML sin AUTORIZACION: CAF-XML', async () => {
    datosFallo(await ingestar(xmlCaf({ conAutorizacion: false })), 'CAF-XML');

    expect(knexUpsert).not.toHaveBeenCalled();
  });

  it('entrada vacía: CAF-STORE y CAF-XML', async () => {
    datosFallo(await ingestar(xmlCaf(), ''), 'CAF-STORE');
    datosFallo(await ingestar('   '), 'CAF-XML');

    expect(fromMock).not.toHaveBeenCalled();
  });

  it('resultado exitoso: nunca expone XML, PEM ni ciphertext', async () => {
    const xml = xmlCaf({ conPrefijo: true, conPemFalso: true });
    const datos = datosOk(await ingestar(xml));
    const serializadoDatos = JSON.stringify(datos);
    const serializadoConUpsert = JSON.stringify({ datos, upsert: payloadUpsert() });

    expect(serializadoConUpsert).toContain('02:');
    expect(serializadoDatos).not.toContain('<AUTORIZACION');
    expect(serializadoDatos).not.toContain('<CAF');
    expect(serializadoDatos).not.toContain('<RE>');
    expect(serializadoDatos).not.toContain('BEGIN PRIVATE KEY');
    expect(serializadoDatos).not.toContain('CLAVE-SINTETICA-NO-REAL');
    expect(serializadoDatos).not.toMatch(/02:[0-9a-f]{24}:/);
    expect(serializadoDatos).not.toContain('SlNTXVRJQw==');
  });

  it('resultado de error: nunca expone XML, PEM ni ciphertext del CAF', async () => {
    db.guardarError = { message: 'upsert denied por RLS' };
    const resultado = await ingestar(xmlCaf({ conPrefijo: true, conPemFalso: true }));
    const serializado = JSON.stringify(resultado);

    datosFallo(resultado, 'CAF-FOLIOS-GUARDAR');
    expect(serializado).not.toContain('<AUTORIZACION');
    expect(serializado).not.toContain('<CAF');
    expect(serializado).not.toContain('BEGIN PRIVATE KEY');
    expect(serializado).not.toMatch(/02:[0-9a-f]{24}:/);
    expect(serializado).not.toContain('SlNTXVRJQw==');
  });
});
