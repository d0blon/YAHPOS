import { esTokenMock, SiiAuth } from './auth';
import { SiiConfig, DtePayload } from './types';
import { generateBoletaXml } from './templates/boleta';
import { generateFacturaXml } from './templates/factura';
import { generateNotaCreditoXml } from './templates/nota_credito';
import { generateNotaDebitoXml } from './templates/nota_debito';
import { generateGuiaXml } from './templates/guia_despacho';
import { createClient } from '@supabase/supabase-js';
import { SiiCafParser, validarCafParaEmision } from './caf';
import { consultarEstadoUpload } from './aceptacion';
import { dividirRut } from './rut';
import { generateEnvioXml, enviarAlSII } from './envio';
import { bytesLatin1 } from './encoding';
import { yaFueRecibido } from './recepcion';
import { decrypt } from '../crypto';
import { decodeCaf } from './caf-store';
import { fechaChile } from './fecha-chile';

/** Descifra caf_xml (legacy plano, CBC o GCM). Formato desconocido falla cerrado. */
function descifrarCaf(raw: string | null | undefined): string {
  return decodeCaf(raw);
}

/** Metadatos de la emisión. `test` activa firma y track simulados: nunca se sube al SII. */
export interface DteMetadata {
  test?: boolean;
  [clave: string]: unknown;
}

/**
 * Resultado de emitir. `success` es literal a propósito: los paneles hacen
 * `if (result.success)` para leer `folio`, y con un `boolean` ancho ese estrechamiento
 * no ocurre (TS deja de ver `folio` en la rama de éxito).
 */
export type ResultadoEmision =
  | { success: true; folio: number; documentId: string; xml: string }
  | { success: false; error: string };

function mensajeDeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** El signer de `SiiAuth` cayó a mock: en modo real no se firma ni se escribe nada. */
function exigirSignerReal(auth: SiiAuth | null, contexto: string): void {
  if (!auth) throw new Error(`${contexto} bloqueado: motor sin autenticación SII`);
  if (auth.enModoMock()) {
    throw new Error(
      `${contexto} bloqueado: el certificado PFX no se pudo abrir y SiiAuth entró en modo MOCK. ` +
        `Revise el certificado y su clave antes de operar en modo real.`
    );
  }
}

/** Un token MOCK nunca es prueba de envío: se corta antes de firmar o grabar estado. */
function exigirTokenReal(token: string, contexto: string): void {
  if (esTokenMock(token)) {
    throw new Error(
      `${contexto} bloqueado: SII no entregó un token real (token MOCK). ` +
        `No se firmará ni se marcará ningún DTE como ENVIADO.`
    );
  }
}

// Agnostic engine logic below

export class SiiEngine {
  private auth: SiiAuth | null = null;
  private config: SiiConfig | null = null;
  private supabase;

  constructor(config?: SiiConfig) {
    if (config) {
      this.config = config;
      this.auth = new SiiAuth(
        config.pfxPath || '', 
        config.pfxPassword || '', 
        config.environment
      );
    }
    
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '' 
    );
  }

  /**
   * Inicializa el motor cargando la configuración desde la base de datos para una tienda específica
   */
  public async initForStore(storeId: string) {
    const { data: configData, error } = await this.supabase
      .from('sii_config')
      .select('certificado_pfx_encrypted, certificado_password_encrypted, rut_emisor, razon_social, giro, acteco, direccion, comuna, ciudad, environment, fch_resol, nro_resol')
      .eq('store_id', storeId)
      .single();

    if (error || !configData) {
      throw new Error(`Configuración SII no encontrada para la tienda: ${storeId}`);
    }

    // Descifrar certificado y contraseña
    const pfxContent = decrypt(configData.certificado_pfx_encrypted);
    const password = decrypt(configData.certificado_password_encrypted);

    this.config = {
      rutEmisor: configData.rut_emisor,
      razonSocial: configData.razon_social,
      giro: configData.giro,
      // <Acteco> es obligatorio en DTE_v10.xsd: sin este codigo la factura no valida.
      acteco: configData.acteco ?? undefined,
      direccion: configData.direccion,
      comuna: configData.comuna,
      ciudad: configData.ciudad,
      environment: configData.environment as 'certification' | 'production',
      pfxPath: pfxContent, // Aquí pasamos el contenido base64 directamente
      pfxPassword: password,
      fchResol: configData.fch_resol ?? undefined,
      nroResol: configData.nro_resol ?? undefined
    };

    this.auth = new SiiAuth(pfxContent, password, this.config.environment);
  }

  private async logEvent(storeId: string, eventType: string, options: { 
    tipoDte?: number, 
    folio?: number, 
    payload?: unknown, 
    response?: unknown, 
    error?: string 
  }) {
    try {
      await this.supabase.from('sii_logs').insert({
        store_id: storeId,
        tipo_dte: options.tipoDte,
        folio: options.folio,
        event_type: eventType,
        payload: options.payload,
        response: options.response,
        error: options.error
      });
    } catch (e) {
      console.error('[SiiEngine] Error escribiendo log:', e);
    }
  }

  private async getNextFolio(tipoDte: number, storeId: string) {
    const { data, error } = await this.supabase
      .rpc('get_next_folio', { 
        p_store_id: storeId, 
        p_tipo_dte: tipoDte 
      });

    if (error || !data || data.length === 0) {
      throw new Error(`Error obteniendo folio: ${error?.message || 'No hay folios disponibles. Cargue un CAF.'}`);
    }

    const folioInfo = data[0];
    return {
      id: folioInfo.v_id,
      folio_actual: folioInfo.v_folio_actual,
      folio_hasta: folioInfo.v_folio_hasta,
      caf_xml: descifrarCaf(folioInfo.v_caf_xml)
    };
  }

  private calculateTaxes(payload: DtePayload) {
    const { Encabezado, Detalles } = payload;
    
    // Si ya vienen calculados, no sobreescribimos a menos que sea necesario
    // Nota: Para Facturas (33) y otros documentos afectos, MntNeto e IVA son obligatorios
    const isAfecto = [33, 52, 56, 61, 39].includes(Encabezado.TipoDTE);

    if (Detalles && Detalles.length > 0) {
      let afectoTotal = 0;
      let exentoTotal = 0;

      Detalles.forEach(item => {
        const monto = Math.round(item.MontoItem ?? (item.QtyItem * item.PrcItem));
        if (item.IndExe === 1) {
          exentoTotal += monto;
        } else if (isAfecto) {
          afectoTotal += monto;
        } else {
          // Si no es afecto ni explícitamente exento por item, tratamos como exento (ej: Boleta Exenta 41)
          exentoTotal += monto;
        }
      });

      const totalFinal = afectoTotal + exentoTotal;

      if (isAfecto) {
        // En Chile, los precios en el POS suelen ser brutos (IVA incluido).
        // El estándar del SII redondea el neto sobre el TOTAL afecto, no por línea:
        // MntNeto = round(Σ afecto / 1.19), IVA = Σ afecto - MntNeto.
        const netoTotal = Math.round(afectoTotal / 1.19);
        const ivaTotal = afectoTotal - netoTotal;
        
        payload.Encabezado.MntNeto = netoTotal;
        payload.Encabezado.MntExe = exentoTotal > 0 ? exentoTotal : undefined;
        payload.Encabezado.IVA = ivaTotal;
        payload.Encabezado.MntTotal = totalFinal;
        payload.Encabezado.TasaIVA = 19;
      } else {
        payload.Encabezado.MntNeto = undefined;
        payload.Encabezado.MntExe = totalFinal;
        payload.Encabezado.IVA = undefined;
        payload.Encabezado.MntTotal = totalFinal;
      }
    } else {
      // Fallback para cuando no hay detalles (emisión directa por montos)
      const total = Encabezado.MntTotal || 0;
      const exento = Encabezado.MntExe || 0;
      const afecto = total - exento;
      
      if (isAfecto && afecto > 0) {
        const neto = Math.round(afecto / 1.19);
        const iva = afecto - neto;
        
        payload.Encabezado.MntNeto = neto;
        payload.Encabezado.IVA = iva;
        payload.Encabezado.TasaIVA = 19;
      }
    }
  }

  /**
   * Alias para emitirDocumento (mantener compatibilidad)
   */
  public async emitirBoleta(
    payload: DtePayload,
    storeId: string,
    metadata: DteMetadata = {}
  ): Promise<ResultadoEmision> {
    return this.emitirDocumento(payload, storeId, metadata);
  }

  public async emitirDocumento(
    payload: DtePayload,
    storeId: string,
    metadata: DteMetadata = {}
  ): Promise<ResultadoEmision> {
    if (!this.config) throw new Error('Motor no inicializado. Llame a initForStore primero.');

    // El modo simulado existe SOLO si el caller lo pide con `metadata.test === true`.
    // En modo real, un signer caído a mock no puede llegar a timbrar ni a insertar.
    if (metadata.test !== true) exigirSignerReal(this.auth, 'Emisión');

    try {
      await this.logEvent(storeId, 'EMISSION_REQUEST', { 
        tipoDte: payload.Encabezado.TipoDTE, 
        payload 
      });

      // 0. Calcular Impuestos si es necesario
      this.calculateTaxes(payload);

      // Garantizar MntTotal como número >= 0 antes de INSERT (puede quedar undefined si no hay detalles ni afecto)
      const total = payload.Encabezado.MntTotal ?? 0;
      if (total < 0) throw new Error('MntTotal negativo no permitido');
      payload.Encabezado.MntTotal = total;

      // 1. Obtener Folio (Usar el proporcionado si existe, de lo contrario obtener siguiente)
      let folioInfo;
      if (payload.Encabezado.Folio && payload.Encabezado.Folio > 0) {
        // Si el folio ya viene asignado (desde el POS offline), verificamos el CAF.
        // El CAF vive en `sii_folios.caf_xml` (es la tabla que llena /api/sii/caf);
        // `sii_cafs` no existe en la base y hacía fallar toda emisión con folio
        // preasignado, que es justo el camino del POS.
        const { data, error } = await this.supabase
          .from('sii_folios')
          .select('caf_xml')
          .eq('store_id', storeId)
          .eq('tipo_dte', payload.Encabezado.TipoDTE)
          .lte('folio_desde', payload.Encabezado.Folio)
          .gte('folio_hasta', payload.Encabezado.Folio)
          .single();
        
        if (error || !data) throw new Error(`Folio ${payload.Encabezado.Folio} fuera de rango o CAF no encontrado.`);
        
        folioInfo = {
          folio_actual: payload.Encabezado.Folio,
          caf_xml: descifrarCaf(data.caf_xml)
        };
      } else {
        folioInfo = await this.getNextFolio(payload.Encabezado.TipoDTE, storeId);
      }
      
      payload.Encabezado = {
        ...payload.Encabezado,
        Folio: folioInfo.folio_actual,
        FchEmis: payload.Encabezado.FchEmis || fechaChile(),
        RUTEmisor: this.config.rutEmisor
      };

      // El CAF autoriza un tipo de DTE, un rango de folios y vence 6 meses después de su
      // `FA`. Se revisa antes de timbrar: un CAF vencido se rechaza con `CAF-3-517` recién
      // al subir el envío, y para entonces el folio ya se gastó y el DTE quedó ambiguo.
      if (!folioInfo.caf_xml) {
        throw new Error(`Sin CAF para el folio ${payload.Encabezado.Folio}: no se puede timbrar`);
      }

      const caf = SiiCafParser.parse(folioInfo.caf_xml);
      const problemasCaf = validarCafParaEmision(caf, {
        tipoDte: payload.Encabezado.TipoDTE,
        folio: payload.Encabezado.Folio,
        fechaFirma: payload.Encabezado.FchEmis,
        rutEmisor: this.config.rutEmisor
      });

      if (problemasCaf.length > 0) {
        throw new Error(
          `CAF no sirve para este DTE (${problemasCaf.map((p) => p.codigo).join(', ')}): ` +
            problemasCaf.map((p) => p.mensaje).join(' · ')
        );
      }

      // 2. Generar TED (Timbre Electrónico)
      const { SiiTedGenerator } = await import('./ted');
      const tedXml = await SiiTedGenerator.generateTed(payload, folioInfo.caf_xml, !!metadata.test);

      // 3. Generar XML Base con TED según TipoDTE
      let xml = '';
      const tipo = payload.Encabezado.TipoDTE;

      // DTE_v10.xsd exige <Acteco> para facturas y notas (no boletas tipo 39/41). Fail-closed.
      if (tipo !== 39 && tipo !== 41 && !this.config.acteco) {
        throw new Error(`acteco obligatorio para tipo DTE ${tipo}`);
      }
      
      if (tipo === 39 || tipo === 41) {
        xml = generateBoletaXml(payload, this.config, tedXml);
      } else if (tipo === 33) {
        xml = generateFacturaXml(payload, this.config, tedXml);
      } else if (tipo === 61) {
        xml = generateNotaCreditoXml(payload, this.config, tedXml);
      } else if (tipo === 56) {
        xml = generateNotaDebitoXml(payload, this.config, tedXml);
      } else if (tipo === 52) {
        xml = generateGuiaXml(payload, this.config, tedXml);
      } else {
        throw new Error(`Tipo de DTE ${tipo} no soportado por plantillas.`);
      }
      
      // 4. Firmar Documento Completo
      let signedDte: string;
      if (metadata.test) {
        console.log('🧪 Modo TEST detectado: Usando firma mock.');
        signedDte = xml.replace('</Documento>', '<Signature>MOCK_SIGNATURE</Signature></Documento>');
      } else {
        const { SiiSigner } = await import('./signer');
        const signer = new SiiSigner(this.config.pfxPath || '', this.config.pfxPassword || '');
        signedDte = signer.signXml(xml, 'Documento');
      }

      // 5. Guardar registro del DTE emitido

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const filename = `${payload.Encabezado.TipoDTE}_F${payload.Encabezado.Folio}.xml`;
      const storagePath = `${storeId}/${year}/${month}/${filename}`;

      // La resolución vive en `sii_config`, no en el XML del DTE ni en `settings`.
      // Se guarda en metadata para que el visor PDF pueda imprimir la real sin
      // inventar valores. No altera el XML firmado.
      const metadataAGuardar = {
        ...metadata,
        ...(this.config.fchResol || this.config.nroResol !== undefined
          ? { resolucion: { fchResol: this.config.fchResol, nroResol: this.config.nroResol } }
          : {})
      };

      const { data: docData, error: docError } = await this.supabase
        .from('sii_documents')
        .insert({
          store_id: storeId,
          folio: payload.Encabezado.Folio,
          tipo_dte: payload.Encabezado.TipoDTE,
          monto_total: payload.Encabezado.MntTotal,
          xml_content: signedDte,
          estado: 'FIRMADO',
          metadata: metadataAGuardar,
          storage_path: storagePath
        })
        .select('id')
        .single();

      if (docError) throw new Error(`Error guardando DTE: ${docError.message}`);

      // 6. Archivar en Storage (Cumplimiento Legal 6 años)
      // Se guardan los bytes ISO-8859-1, no el string: el archivo declara ese charset y
      // un reenvío desde el archivo original tiene que reproducir los mismos bytes.
      try {
        await this.supabase.storage
          .from('sii-xml-archive')
          .upload(storagePath, bytesLatin1(signedDte, 'archivo del DTE'), {
            contentType: 'application/xml',
            upsert: true
          });
      } catch (storageError) {
        console.error('[SiiEngine] Error archivando en storage:', storageError);
        // No bloqueamos la emisión si el storage falla
      }

      await this.logEvent(storeId, 'EMISSION_SUCCESS', {
        tipoDte: payload.Encabezado.TipoDTE,
        folio: payload.Encabezado.Folio,
        response: { documentId: docData.id }
      });

      return {
        success: true,
        folio: payload.Encabezado.Folio,
        documentId: docData.id,
        xml: signedDte
      };

    } catch (error: unknown) {
      const mensaje = mensajeDeError(error);
      console.error('[SiiEngine] Error en emisión:', error);

      await this.logEvent(storeId, 'EMISSION_FAILURE', {
        tipoDte: payload?.Encabezado?.TipoDTE,
        error: mensaje
      });

      return { success: false, error: mensaje };
    }
  }

  /**
   * Alias para enviarDocumentoAlSII
   */
  public async enviarBoletaAlSII(documentId: string, storeId: string) {
    return this.enviarDocumentoAlSII(documentId, storeId);
  }

  /**
   * Toma un DTE ya firmado, lo envuelve en un EnvioDTE y lo envía al SII
   */
  public async enviarDocumentoAlSII(documentId: string, storeId: string) {
    if (!this.config || !this.auth) throw new Error('Motor no inicializado');

    try {
      // 1. Obtener el DTE firmado desde la DB
      // El cliente es service-role y salta RLS: sin el filtro por tienda, un documentId
      // de otra tienda se podía enviar. Filtramos también por store_id.
      const { data: doc, error } = await this.supabase
        .from('sii_documents')
        .select('track_id, estado_sii, xml_content, tipo_dte, folio, metadata')
        .eq('id', documentId)
        .eq('store_id', storeId)
        .single();

      if (error || !doc) throw new Error('DTE no encontrado');

      // Reenviar un documento que el SII ya recibió genera "documento ya ingresado".
      if (yaFueRecibido(doc)) {
        return { success: true, trackId: doc.track_id ?? undefined, yaEnviado: true, raw: '' };
      }

      // La simulación NO la decide el token: la pide explícitamente quien emitió
      // con `metadata.test === true`. En modo real, un token MOCK es un error.
      const esPrueba = (doc.metadata as DteMetadata | null)?.test === true;
      let token: string;
      if (esPrueba) {
        token = 'MOCK_TOKEN_TEST';
      } else {
        exigirSignerReal(this.auth, 'Envío al SII');
        token = await this.auth.getToken();
        exigirTokenReal(token, 'Envío al SII');
      }

      // 3. Generar XML de Envío
      const rutEnvia = this.config.rutEmisor; 
      const envioXmlBase = generateEnvioXml([doc.xml_content], this.config, rutEnvia);

      // 4. Firmar el Envío (SetDTE)
      let signedEnvio: string;
      if (esPrueba) {
        console.log('🧪 Modo TEST detectado: Usando firma mock para Envío.');
        signedEnvio = envioXmlBase.replace('</SetDTE>', '<Signature>MOCK_ENVIO_SIGNATURE</Signature></SetDTE>');
      } else {
        const { SiiSigner } = await import('./signer');
        const signer = new SiiSigner(this.config.pfxPath || '', this.config.pfxPassword || '');
        signedEnvio = signer.signXml(envioXmlBase, 'SetDTE');
      }

      // 5. Enviar al SII
      let result;
      if (esPrueba) {
        console.log('🧪 Modo TEST detectado: Simulando envío exitoso.');
        result = { success: true, trackId: '9999999999', raw: '<STATUS>0</STATUS><TRACKID>9999999999</TRACKID>' };
      } else {
        const fileName = `ENVIO_DTE_${doc.tipo_dte}_F${doc.folio}.xml`;
        result = await enviarAlSII(signedEnvio, fileName, token, this.config.environment);
      }


      // 6. Actualizar DB
      if (result.success) {
        const { error: updateError } = await this.supabase
          .from('sii_documents')
          .update({
            track_id: result.trackId,
            estado_sii: 'ENVIADO',
            xml_envio: signedEnvio,
            estado: 'ENVIADO'
          })
          .eq('id', documentId)
          .eq('store_id', storeId);
        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await this.supabase
          .from('sii_documents')
          .update({
            estado_sii: 'RECHAZADO_SII',
            // La UI (`InvoiceHistoryTable`) lee `estado`, no `estado_sii`: sin esto el
            // historial seguiría mostrando el DTE como FIRMADO después del rechazo.
            estado: 'RECHAZADO',
            // `sii_documents` no tiene columna `error_log`: el update completo fallaba y
            // se perdía el estado del rechazo. La glosa del SII se guarda en `sii_response`.
            sii_response: result.error
          })
          .eq('id', documentId)
          .eq('store_id', storeId);
        if (updateError) throw updateError;
      }

      return result;

    } catch (error: unknown) {
      const mensaje = mensajeDeError(error);
      console.error('[SiiEngine] Error en envío:', error);
      return { success: false, error: mensaje };
    }
  }

  /**
   * Consulta el veredicto real de un envío ya recepcionado.
   *
   * `DTEUpload` sólo confirma recepción (`STATUS=0` + `TRACKID`); la aceptación la decide
   * el SII después, y sólo se sabe preguntando. Sin esto un DTE rechazado se queda en
   * `ENVIADO` para siempre, y uno aceptado también.
   *
   * Se escribe estado únicamente cuando el SII lo dijo por escrito (`ACEPTADOS` /
   * `RECHAZADOS`): `EPR` (en proceso) y los códigos abreviados dejan el documento como
   * está, porque pisar `ENVIADO` con un veredicto desconocido perdería el rastro de que el
   * envío sí fue recibido.
   */
  public async consultarEstadoEnvio(documentId: string, storeId: string) {
    if (!this.config || !this.auth) throw new Error('Motor no inicializado');

    try {
      // Cliente service-role (salta RLS): el filtro por tienda es obligatorio.
      const { data: doc, error } = await this.supabase
        .from('sii_documents')
        .select('id, track_id, tipo_dte, folio, metadata')
        .eq('id', documentId)
        .eq('store_id', storeId)
        .single();

      if (error || !doc) throw new Error('DTE no encontrado');

      const trackId = String(doc.track_id ?? '').trim();
      if (!trackId) {
        return {
          success: false,
          veredicto: 'DESCONOCIDO' as const,
          error: 'El DTE no tiene track id: el SII todavía no lo recibió'
        };
      }

      if ((doc.metadata as DteMetadata | null)?.test === true) {
        return {
          success: false,
          veredicto: 'DESCONOCIDO' as const,
          error: 'Consulta de estado no disponible para DTE de prueba (no fue enviado al SII)'
        };
      }

      // Consultar con un token simulado daría un veredicto inventado. Fail-closed.
      exigirSignerReal(this.auth, 'Consulta de estado');
      const token = await this.auth.getToken();
      exigirTokenReal(token, 'Consulta de estado');
      const { numero, dv } = dividirRut(this.config.rutEmisor);

      const estado = await consultarEstadoUpload(this.config.environment, {
        rutCompania: numero,
        dvCompania: dv,
        trackId,
        token
      });

      if (!estado.consultaOk) {
        const detalle = `${estado.codigo ?? 'sin estado'}${estado.glosa ? `: ${estado.glosa}` : ''}`;
        await this.logEvent(storeId, 'STATUS_QUERY_FAILED', {
          tipoDte: doc.tipo_dte,
          folio: doc.folio,
          response: estado.raw,
          error: detalle
        });
        return {
          success: false,
          veredicto: estado.veredicto,
          codigo: estado.codigo,
          glosa: estado.glosa
        };
      }

      if (estado.veredicto !== 'DESCONOCIDO') {
        const aceptado = estado.veredicto === 'ACEPTADO';
        const { error: updateError } = await this.supabase
          .from('sii_documents')
          .update({
            estado_sii: aceptado ? 'ACEPTADO' : 'RECHAZADO_SII',
            // La UI lee `estado`; si se actualiza sólo `estado_sii` el historial no cambia.
            estado: aceptado ? 'ACEPTADO' : 'RECHAZADO',
            sii_response: estado.cuerpo || estado.raw
          })
          .eq('id', documentId)
          .eq('store_id', storeId);
        if (updateError) throw updateError;
      }

      await this.logEvent(storeId, 'STATUS_QUERY', {
        tipoDte: doc.tipo_dte,
        folio: doc.folio,
        response: { veredicto: estado.veredicto, cuerpo: estado.cuerpo }
      });

      return {
        success: true,
        veredicto: estado.veredicto,
        codigo: estado.codigo,
        glosa: estado.glosa,
        cuerpo: estado.cuerpo
      };

    } catch (error: unknown) {
      const mensaje = mensajeDeError(error);
      console.error('[SiiEngine] Error consultando estado del envío:', error);
      await this.logEvent(storeId, 'STATUS_QUERY_FAILED', { error: mensaje });
      return { success: false, veredicto: 'DESCONOCIDO' as const, error: mensaje };
    }
  }

}
