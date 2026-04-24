import { SiiAuth } from './auth';
import { SiiConfig, DtePayload } from './types';
import { generateBoletaXml } from './templates/boleta';
import { createClient } from '@supabase/supabase-js';

export class SiiEngine {
  private auth: SiiAuth;
  private config: SiiConfig;
  private supabase;

  constructor(config: SiiConfig) {
    this.config = config;
    this.auth = new SiiAuth(
      config.pfxPath || '', 
      config.pfxPassword || '', 
      config.environment
    );
    
    // Inicializar Supabase para guardar documentos
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '' // Usamos service role para saltar RLS en server-side
    );
  }

  public async emitirBoleta(payload: DtePayload, businessId: string) {
    try {
      const token = await this.auth.getToken();
      const xml = generateBoletaXml(payload, this.config);
      
      const { SiiSigner } = await import('./signer');
      const signer = new SiiSigner(this.config.pfxPath || '', this.config.pfxPassword || '');
      const signedDte = signer.signXml(xml, 'Documento');

      // GUARDAR EN BASE DE DATOS
      const { data, error } = await this.supabase
        .from('sii_documents')
        .insert({
          business_id: businessId,
          folio: payload.Encabezado.Folio,
          tipo_dte: payload.Encabezado.TipoDTE,
          monto_total: payload.Encabezado.MntTotal,
          xml_content: signedDte,
          estado: 'FIRMADO'
        })
        .select();

      if (error) throw error;

      return {
        success: true,
        folio: payload.Encabezado.Folio,
        documentId: data[0].id,
        xml: signedDte,
        token
      };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
