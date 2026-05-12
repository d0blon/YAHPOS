import { SiiAuth } from './auth';
import { SiiConfig, DtePayload } from './types';
import { generateBoletaXml } from './templates/boleta';
import { generateFacturaXml } from './templates/factura';
import { generateNotaCreditoXml } from './templates/nota_credito';
import { generateNotaDebitoXml } from './templates/nota_debito';
import { generateGuiaXml } from './templates/guia_despacho';
import { createClient } from '@supabase/supabase-js';
import { SiiCafParser } from './caf';
import { generateEnvioXml, enviarAlSII } from './envio';
import { decrypt } from '../crypto';
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
      .select('*')
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
      direccion: configData.direccion,
      comuna: configData.comuna,
      ciudad: configData.ciudad,
      environment: configData.environment as 'certification' | 'production',
      pfxPath: pfxContent, // Aquí pasamos el contenido base64 directamente
      pfxPassword: password,
      fchResol: configData.fch_resol,
      nroResol: configData.nro_resol
    };

    this.auth = new SiiAuth(pfxContent, password, this.config.environment);
  }

  private async logEvent(storeId: string, eventType: string, options: { 
    tipoDte?: number, 
    folio?: number, 
    payload?: any, 
    response?: any, 
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
      caf_xml: folioInfo.v_caf_xml
    };
  }

  private calculateTaxes(payload: DtePayload) {
    const { Encabezado, Detalles } = payload;
    
    // Si ya vienen calculados, no sobreescribimos a menos que sea necesario
    // Nota: Para Facturas (33) y otros documentos afectos, MntNeto e IVA son obligatorios
    const isAfecto = [33, 52, 56, 61, 39].includes(Encabezado.TipoDTE);
    const isExento = Encabezado.TipoDTE === 41;

    if (Detalles && Detalles.length > 0) {
      let netoTotal = 0;
      let exentoTotal = 0;
      let totalFinal = 0;

      Detalles.forEach(item => {
        const monto = item.MontoItem || (item.QtyItem * item.PrcItem);
        if (item.IndExe === 1) {
          exentoTotal += monto;
        } else if (isAfecto) {
          // En Chile, los precios en el POS suelen ser brutos (IVA incluido)
          // Calculamos el neto redondeando según estándar SII
          const neto = Math.round(monto / 1.19);
          netoTotal += neto;
        } else {
          // Si no es afecto ni explícitamente exento por item, tratamos como exento (ej: Boleta Exenta 41)
          exentoTotal += monto;
        }
        totalFinal += monto;
      });

      if (isAfecto) {
        // El IVA es la diferencia para asegurar que la suma cuadre con el total bruto
        const ivaTotal = totalFinal - netoTotal - exentoTotal;
        
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
  public async emitirBoleta(payload: DtePayload, storeId: string, metadata: any = {}) {
    return this.emitirDocumento(payload, storeId, metadata);
  }

  public async emitirDocumento(payload: DtePayload, storeId: string, metadata: any = {}) {
    if (!this.config) throw new Error('Motor no inicializado. Llame a initForStore primero.');

    try {
      await this.logEvent(storeId, 'EMISSION_REQUEST', { 
        tipoDte: payload.Encabezado.TipoDTE, 
        payload 
      });

      // 0. Calcular Impuestos si es necesario
      this.calculateTaxes(payload);

      // 1. Obtener Folio (Usar el proporcionado si existe, de lo contrario obtener siguiente)
      let folioInfo;
      if (payload.Encabezado.Folio && payload.Encabezado.Folio > 0) {
        // Si el folio ya viene asignado (desde el POS offline), verificamos el CAF
        const { data, error } = await this.supabase
          .from('sii_cafs')
          .select('xml_content')
          .eq('store_id', storeId)
          .eq('tipo_dte', payload.Encabezado.TipoDTE)
          .lte('folio_desde', payload.Encabezado.Folio)
          .gte('folio_hasta', payload.Encabezado.Folio)
          .single();
        
        if (error || !data) throw new Error(`Folio ${payload.Encabezado.Folio} fuera de rango o CAF no encontrado.`);
        
        folioInfo = {
          folio_actual: payload.Encabezado.Folio,
          caf_xml: data.xml_content
        };
      } else {
        folioInfo = await this.getNextFolio(payload.Encabezado.TipoDTE, storeId);
      }
      
      payload.Encabezado = {
        ...payload.Encabezado,
        Folio: folioInfo.folio_actual,
        FchEmis: payload.Encabezado.FchEmis || new Date().toISOString().split('T')[0],
        RUTEmisor: this.config.rutEmisor
      };

      // 2. Generar TED (Timbre Electrónico)
      const { SiiTedGenerator } = await import('./ted');
      const tedXml = await SiiTedGenerator.generateTed(payload, folioInfo.caf_xml, !!metadata.test);

      // 3. Generar XML Base con TED según TipoDTE
      let xml = '';
      const tipo = payload.Encabezado.TipoDTE;
      
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

      const { data: docData, error: docError } = await this.supabase
        .from('sii_documents')
        .insert({
          store_id: storeId,
          folio: payload.Encabezado.Folio,
          tipo_dte: payload.Encabezado.TipoDTE,
          monto_total: payload.Encabezado.MntTotal,
          xml_content: signedDte,
          estado: 'FIRMADO',
          metadata: metadata,
          storage_path: storagePath
        })
        .select()
        .single();

      if (docError) throw new Error(`Error guardando DTE: ${docError.message}`);

      // 6. Archivar en Storage (Cumplimiento Legal 6 años)
      try {
        await this.supabase.storage
          .from('sii-xml-archive')
          .upload(storagePath, signedDte, {
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

    } catch (error: any) {
      console.error('[SiiEngine] Error en emisión:', error);
      
      await this.logEvent(storeId, 'EMISSION_FAILURE', {
        tipoDte: payload?.Encabezado?.TipoDTE,
        error: error.message
      });

      return { success: false, error: error.message };
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
      const { data: doc, error } = await this.supabase
        .from('sii_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error || !doc) throw new Error('DTE no encontrado');

      // 2. Obtener Token de Acceso
      const token = await this.auth.getToken();

      // 3. Generar XML de Envío
      const rutEnvia = this.config.rutEmisor; 
      const envioXmlBase = generateEnvioXml([doc.xml_content], this.config, rutEnvia);

      // 4. Firmar el Envío (SetDTE)
      let signedEnvio: string;
      if (token.startsWith('MOCK_TOKEN')) {
        console.log('🧪 Modo TEST detectado: Usando firma mock para Envío.');
        signedEnvio = envioXmlBase.replace('</SetDTE>', '<Signature>MOCK_ENVIO_SIGNATURE</Signature></SetDTE>');
      } else {
        const { SiiSigner } = await import('./signer');
        const signer = new SiiSigner(this.config.pfxPath || '', this.config.pfxPassword || '');
        signedEnvio = signer.signXml(envioXmlBase, 'SetDTE');
      }

      // 5. Enviar al SII
      let result;
      if (token.startsWith('MOCK_TOKEN')) {
        console.log('🧪 Modo TEST detectado: Simulando envío exitoso.');
        result = { success: true, trackId: '9999999999', raw: '<STATUS>0</STATUS><TRACKID>9999999999</TRACKID>' };
      } else {
        const fileName = `ENVIO_DTE_${doc.tipo_dte}_F${doc.folio}.xml`;
        result = await enviarAlSII(signedEnvio, fileName, token, this.config.environment);
      }


      // 6. Actualizar DB
      if (result.success) {
        await this.supabase
          .from('sii_documents')
          .update({
            track_id: result.trackId,
            estado_sii: 'ENVIADO',
            xml_envio: signedEnvio,
            estado: 'ENVIADO'
          })
          .eq('id', documentId);
      } else {
        await this.supabase
          .from('sii_documents')
          .update({
            estado_sii: 'RECHAZADO_SII',
            error_log: result.error
          })
          .eq('id', documentId);
      }

      return result;

    } catch (error: any) {
      console.error('[SiiEngine] Error en envío:', error);
      return { success: false, error: error.message };
    }
  }

}
