import { SiiEngine } from '@/lib/sii/engine';
import { normalizarRutEmisor, validarCafParaEmision } from '@/lib/sii/caf';
import { extraerDatosPdf } from '@/lib/sii/pdf-datos';
import { generateBoletaPdf } from '@/lib/sii/pdf-generator';
import { esTokenMock } from '@/lib/sii/auth';
import { enviarAlSII } from '@/lib/sii/envio';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://sii-test.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sii-test-key';
process.env.SII_ENCRYPTION_KEY = 'test-key-32-chars-long-1234567890';

interface Fila {
  tabla: string;
  valores: Record<string, unknown>;
}

interface EstadoDb {
  doc: Record<string, unknown> | null;
  cafXml: string;
  inserts: Fila[];
  updates: Fila[];
}

/** Doble de PostgREST: registra toda escritura y devuelve el documento configurado. */
jest.mock('@supabase/supabase-js', () => {
  const estado: EstadoDb = {
    doc: null,
    cafXml: '',
    inserts: [],
    updates: [],
  };
  (globalThis as unknown as { __siiDb: EstadoDb }).__siiDb = estado;

  class Consulta {
    constructor(
      private readonly tabla: string,
      private readonly valores: Record<string, unknown> = {},
    ) {}

    select(): this { return this; }
    eq(): this { return this; }
    lte(): this { return this; }
    gte(): this { return this; }
    limit(): this { return this; }
    order(): this { return this; }

    insert(valores: Record<string, unknown>): this {
      estado.inserts.push({ tabla: this.tabla, valores });
      return this;
    }

    update(valores: Record<string, unknown>): this {
      estado.updates.push({ tabla: this.tabla, valores });
      return this;
    }

    single(): Promise<{ data: unknown; error: null }> {
      if (this.tabla === 'sii_folios') {
        return Promise.resolve({ data: { caf_xml: estado.cafXml }, error: null });
      }
      if (this.tabla === 'sii_documents') {
        return Promise.resolve({ data: estado.doc ? { ...estado.doc } : null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }

    then<T1 = { data: unknown; error: null }>(
      onFulfilled?: ((value: { data: unknown; error: null }) => T1) | null,
    ): Promise<T1> {
      return Promise.resolve({ data: null, error: null }).then(onFulfilled ?? (() => undefined as T1));
    }
  }

  return {
    createClient: jest.fn(() => ({
      from: (tabla: string) => new Consulta(tabla),
      storage: {
        from: () => ({ upload: async () => ({ error: null }) }),
      },
    })),
  };
});

jest.mock('@/lib/sii/envio', () => ({
  generateEnvioXml: jest.fn(() => '<EnvioDTE><SetDTE></SetDTE></EnvioDTE>'),
  enviarAlSII: jest.fn(async () => ({ success: true, trackId: '7777777777', raw: '<STATUS>0</STATUS>' })),
}));

jest.mock('@/lib/sii/signer', () => ({
  SiiSigner: jest.fn().mockImplementation(() => ({
    signXml: (xml: string) => xml.replace('</SetDTE>', '<Signature>REAL</Signature></SetDTE>'),
  })),
}));

/** jsPDF falso: captura el texto impreso sin depender de canvas ni de fuentes. */
jest.mock('jspdf', () => {
  class JsPdfFalso {
    setDrawColor(): this { return this; }
    setLineWidth(): this { return this; }
    setFontSize(): this { return this; }
    setFont(): this { return this; }
    setTextColor(): this { return this; }
    rect(): this { return this; }
    line(): this { return this; }
    addImage(): this { return this; }
    splitTextToSize(texto: unknown): string[] { return [String(texto)]; }
    text(valor: unknown): void {
      const destino = (globalThis as unknown as { __pdfTexto: string[] }).__pdfTexto;
      destino.push(Array.isArray(valor) ? valor.map(String).join(' ') : String(valor));
    }
    output(): ArrayBuffer { return new ArrayBuffer(8); }
  }
  return { jsPDF: JsPdfFalso };
});

jest.mock('@/lib/sii/pdf417', () => ({
  generarTimbrePdf417: jest.fn(async () => Buffer.from([1, 2, 3])),
}));

const config = {
  rutEmisor: '76123456-0',
  razonSocial: 'EMISOR DE PRUEBA',
  giro: 'VENTAS',
  direccion: 'CALLE 1',
  comuna: 'SANTIAGO',
  ciudad: 'SANTIAGO',
  environment: 'certification' as const,
  pfxPath: 'pfx-base64',
  pfxPassword: 'clave',
  fchResol: '2026-01-15',
  nroResol: 123,
};

const db = (): EstadoDb => (globalThis as unknown as { __siiDb: EstadoDb }).__siiDb;

function motorCon(auth: { enModoMock(): boolean; getToken(): Promise<string> }): SiiEngine {
  const engine = new SiiEngine(config);
  (engine as unknown as { auth: unknown }).auth = auth;
  return engine;
}

function documento(metadata: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 'doc-1',
    folio: 1,
    tipo_dte: 39,
    track_id: null,
    estado_sii: null,
    estado: 'FIRMADO',
    xml_content: '<DTE><Documento><TED>x</TED></Documento></DTE>',
    metadata,
  };
}

function cafConRut(rut: string): string {
  return '<?xml version="1.0" encoding="ISO-8859-1"?>' +
    '<AUTORIZACION><CAF version="1.0"><DA>' +
    `<RE>${rut}</RE><RS>EMISOR</RS><TD>39</TD><RNG><D>1</D><H>10</H></RNG>` +
    '<FA>2026-01-01</FA><RSAPK><M>AA==</M><E>AA==</E></RSAPK><IDK>100</IDK>' +
    '</DA></CAF><RSASK><M>AA==</M><E>AA==</E><D>AA==</D></RSASK></AUTORIZACION>';
}

beforeEach(() => {
  jest.clearAllMocks();
  const estado = db();
  estado.doc = documento({});
  estado.cafXml = cafConRut(config.rutEmisor);
  estado.inserts = [];
  estado.updates = [];
  (globalThis as unknown as { __pdfTexto: string[] }).__pdfTexto = [];
});

describe('ST5 — fail-closed PFX/token MOCK', () => {
  it('token MOCK en modo real: error, cero escrituras y cero trackId falso', async () => {
    const auth = {
      enModoMock: jest.fn(() => false),
      getToken: jest.fn(async () => 'MOCK_TOKEN_123456'),
    };
    expect(esTokenMock('MOCK_TOKEN_123456')).toBe(true);

    const resultado = await motorCon(auth).enviarDocumentoAlSII('doc-1', 'store-1');

    expect(resultado.success).toBe(false);
    expect(resultado.success === false && resultado.error).toContain('token MOCK');
    expect(auth.getToken).toHaveBeenCalledTimes(1);
    expect(enviarAlSII).not.toHaveBeenCalled();
    expect(db().inserts.filter((f) => f.tabla === 'sii_documents')).toHaveLength(0);
    expect(db().updates.filter((f) => f.tabla === 'sii_documents')).toHaveLength(0);
    expect(JSON.stringify(resultado)).not.toContain('9999999999');
  });

  it('signer caído a mock en modo real: ni siquiera pide token', async () => {
    const auth = {
      enModoMock: jest.fn(() => true),
      getToken: jest.fn(async () => 'MOCK_TOKEN_123456'),
    };

    const resultado = await motorCon(auth).enviarDocumentoAlSII('doc-1', 'store-1');

    expect(resultado.success).toBe(false);
    expect(resultado.success === false && resultado.error).toContain('certificado PFX');
    expect(auth.getToken).not.toHaveBeenCalled();
    expect(enviarAlSII).not.toHaveBeenCalled();
    expect(db().updates.filter((f) => f.tabla === 'sii_documents')).toHaveLength(0);
    expect(JSON.stringify(resultado)).not.toContain('9999999999');
  });

  it('modo test explícito (metadata.test) sigue simulando sin POST al SII', async () => {
    db().doc = documento({ test: true });
    const auth = {
      enModoMock: jest.fn(() => true),
      getToken: jest.fn(async () => 'MOCK_TOKEN_123456'),
    };

    const resultado = await motorCon(auth).enviarDocumentoAlSII('doc-1', 'store-1');

    expect(resultado.success).toBe(true);
    expect(resultado.success === true && resultado.trackId).toBe('9999999999');
    expect(auth.getToken).not.toHaveBeenCalled();
    expect(enviarAlSII).not.toHaveBeenCalled();
    expect(db().updates.some((f) => f.tabla === 'sii_documents' && f.valores.estado === 'ENVIADO')).toBe(true);
  });
});

describe('ST5 — CAF con RE ajeno', () => {
  it('validación directa rechaza RE distinto y normaliza guion/puntos/cero', () => {
    const caf = { rut: '76123456-0', tipoDte: 39, desde: 1, hasta: 10, fecha: '2026-01-01' };
    const uso = { tipoDte: 39, folio: 1, fechaFirma: '2026-01-15' };

    const ajeno = validarCafParaEmision(caf, { ...uso, rutEmisor: '77123456-7' });
    expect(ajeno.some((p) => p.codigo === 'LOCAL-RE')).toBe(true);

    const mismo = validarCafParaEmision(
      { ...caf, rut: '07612345-7' },
      { ...uso, rutEmisor: '76.123.45-7' },
    );
    expect(mismo).toEqual([]);
    expect(normalizarRutEmisor('76.123.456-0')).toBe('76123456-0');
  });

  it('emisión rechaza el CAF ajeno antes de insertar el DTE', async () => {
    db().cafXml = cafConRut('77123456-7');
    const auth = { enModoMock: jest.fn(() => false), getToken: jest.fn(async () => 'TOKEN') };
    const payload = {
      Encabezado: {
        TipoDTE: 39 as const,
        Folio: 1,
        FchEmis: '2026-01-15',
        RUTRecep: '66666666-6',
        MntTotal: 1000,
      },
      Detalles: [{ NmbItem: 'PRUEBA', QtyItem: 1, PrcItem: 840, MontoItem: 840 }],
    };

    const resultado = await motorCon(auth).emitirDocumento(payload, 'store-1');

    expect(resultado.success).toBe(false);
    expect(resultado.success === false && resultado.error).toContain('LOCAL-RE');
    expect(db().inserts.filter((f) => f.tabla === 'sii_documents')).toHaveLength(0);
  });
});

describe('ST5 — PDF con detalle SII', () => {
  it('extrae y muestra desglose, resolución real y referencias sin tocar el TED', async () => {
    const xml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<DTE xmlns="http://www.sii.cl/SiiDte" version="1.0"><Documento ID="F1T39">
<Encabezado>
<IdDoc><TipoDTE>39</TipoDTE><Folio>1</Folio><FchEmis>2026-11-19</FchEmis>
<Referencia><NroLinRef>1</NroLinRef><TpoDocRef>33</TpoDocRef><FolioRef>55</FolioRef><FchRef>2026-11-01</FchRef><CodRef>1</CodRef><RazonRef>ANULA DOCUMENTO</RazonRef></Referencia>
</IdDoc>
<Emisor><RUTEmisor>76.123.456-0</RUTEmisor><RznSocEmisor>EMISOR DE PRUEBA</RznSocEmisor><GiroEmisor>VENTAS</GiroEmisor><DirOrigen>CALLE 1</DirOrigen></Emisor>
<Receptor><RUTRecep>66666666-6</RUTRecep></Receptor>
<Totales><MntNeto>840</MntNeto><TasaIVA>19</TasaIVA><IVA>160</IVA><MntTotal>1000</MntTotal></Totales>
</Encabezado>
<Detalle><NmbItem>PRODUCTO</NmbItem><QtyItem>1</QtyItem><PrcItem>840</PrcItem><MontoItem>840</MontoItem></Detalle>
<TED version="1.0"><DD>CAF-DETERMINISTA</DD></TED></Documento></DTE>`;

    const datos = extraerDatosPdf(xml, {
      metadata: { resolucion: { fchResol: '2026-01-15', nroResol: 123 } },
    });

    expect(datos.timbre).toBe('<TED version="1.0"><DD>CAF-DETERMINISTA</DD></TED>');
    expect(datos.totales).toMatchObject({ mntNeto: 840, iva: 160, tasaIVA: 19 });
    expect(datos.resolucion).toEqual({ fchResol: '2026-01-15', nroResol: 123 });
    expect(datos.referencias).toEqual([
      expect.objectContaining({ tipo: '33', folio: '55', codigo: '1', razon: 'ANULA DOCUMENTO' }),
    ]);

    const bytes = await generateBoletaPdf(datos);
    expect(bytes.byteLength).toBeGreaterThan(0);

    const impreso = (globalThis as unknown as { __pdfTexto: string[] }).__pdfTexto.join('\n');
    expect(impreso).toContain('Neto: $840');
    expect(impreso).toContain('IVA 19%: $160');
    expect(impreso).toContain('Tasa IVA: 19%');
    expect(impreso).toContain('Resolución SII: N° 123 del 2026-01-15');
    expect(impreso).toContain('REFERENCIAS:');
    expect(impreso).toContain('Doc 33 · Folio 55');
    expect(impreso).toContain('ANULA DOCUMENTO');
  });
});
