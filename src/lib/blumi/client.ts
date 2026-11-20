/**
 * Cliente para Blumi DTE Sandbox API.
 * 
 * Endpoint: https://dte.blumi.cl/api/v1/sandbox
 * 
 * Referencia: swagger en https://dte.blumi.cl/docs (OpenAPI 3.0)
 * 
 * Uso (solo servidor):
 *   const client = await getBlumiClient(storeId);
 *   const result = await client.emitirDte(payload);
 */

export type BlumiDteType = 33 | 34 | 39 | 41 | 52 | 56 | 61;

export interface BlumiDteItem {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  exento?: boolean;
}

export interface BlumiDteReceptor {
  rut: string;
  razon_social: string;
  giro?: string;
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  email?: string;
}

export interface BlumiEmitirRequest {
  tipo_dte: BlumiDteType;
  folio?: number;
  fecha_emision?: string; // YYYY-MM-DD
  receptor: BlumiDteReceptor;
  items: BlumiDteItem[];
  medio_pago?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  condiciones_pago?: string;
  fecha_vencimiento?: string;
  referencia?: {
    tipo_documento: number;
    folio: string;
    fecha: string;
    codigo: number; // 1=anula, 2=corrige texto, 3=corrige montos
    motivo: string;
  };
}

export interface BlumiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    solution?: string;
  };
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

export interface BlumiDteEmitido {
  id: string;
  folio: number;
  tipo_dte: BlumiDteType;
  estado: 'queued' | 'sent' | 'accepted' | 'rejected' | 'review_required' | 'failed';
  xml?: string;
  pdf_url?: string;
  timbre?: string;
  created_at: string;
}

export interface BlumiDteStatus {
  id: string;
  folio: number;
  tipo_dte: BlumiDteType;
  estado: 'queued' | 'sent' | 'accepted' | 'rejected' | 'review_required' | 'failed';
  glosa?: string;
  xml?: string;
  pdf_url?: string;
  updated_at: string;
}

export interface BlumiValidateTimbreRequest {
  xml: string; // XML firmado del DTE
}

export interface BlumiValidateTimbreResponse {
  valid: boolean;
  pdf417_present: boolean;
  pdf417_valid: boolean;
  rsa_signature_valid: boolean;
  errors: string[];
}

import { createAdminClient } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';

const BLUMI_API_KEY_SETTING = 'payment_blumi_api_key';

export class BlumiClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    const resolvedBaseUrl = baseUrl || process.env.BLUMI_SANDBOX_URL;

    if (!resolvedBaseUrl && process.env.NODE_ENV === 'production') {
      throw new Error('Blumi: BLUMI_SANDBOX_URL es requerida en producción');
    }

    this.apiKey = apiKey;
    this.baseUrl = resolvedBaseUrl || 'https://dte.blumi.cl/api/v1/sandbox';

    if (!this.apiKey) {
      throw new Error('Blumi: API key no configurada para la tienda');
    }
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<BlumiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    
    const headers: Record<string, string> = {
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'YAHPOS/1.0',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const text = await response.text();

      // Blumi devuelve JSON, pero por si acaso
      let parsed: BlumiResponse<T>;
      try {
        parsed = JSON.parse(text);
      } catch {
        return {
          ok: false,
          error: {
            code: 'PARSE_ERROR',
            message: `Respuesta no es JSON (HTTP ${response.status})`,
            solution: 'Verifica que la URL del sandbox sea correcta',
          },
        };
      }

      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: {
          code: 'NETWORK_ERROR',
          message,
          solution: 'Verifica conectividad con el sandbox de Blumi',
        },
      };
    }
  }

  /**
   * Emite un DTE en el sandbox de Blumi.
   * El sandbox simula el SII: no consume folios reales ni tiene validez legal.
   * 
   * ⚠️ REQUIERE certificado .pfx configurado en portal web de Blumi.
   */
  async emitirDte(payload: BlumiEmitirRequest): Promise<BlumiResponse<BlumiDteEmitido>> {
    return this.request<BlumiDteEmitido>('POST', '/dte/emit', payload);
  }

  /**
   * Consulta el estado de un DTE previamente emitido.
   */
  async consultarEstado(id: string): Promise<BlumiResponse<BlumiDteStatus>> {
    return this.request<BlumiDteStatus>('GET', `/dte/${id}`);
  }

  /**
   * Valida el timbre (PDF417) y firma RSA de un DTE XML.
   * Útil para verificar que nuestro motor genera timbres válidos.
   */
  async validarTimbre(xml: string): Promise<BlumiResponse<BlumiValidateTimbreResponse>> {
    return this.request<BlumiValidateTimbreResponse>('POST', '/dte/validar-timbre', { xml });
  }

  /**
   * Obtiene información del ambiente sandbox (para diagnosticar).
   */
  async ping(): Promise<BlumiResponse<{ status: string; ambiente: string }>> {
    return this.request('GET', '/ping');
  }
}

/**
 * Cliente por tienda. La API key se lee cifrada de `settings` con service role
 * y se descifra únicamente en servidor. Sin credenciales configuradas falla cerrado.
 */
export async function getBlumiClient(storeId: string): Promise<BlumiClient> {
  if (!storeId) {
    throw new Error('Blumi: se requiere storeId');
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .eq('store_id', storeId)
    .eq('key', BLUMI_API_KEY_SETTING)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Blumi] No se pudo leer la configuración de la tienda');
    throw new Error('No se pudo leer la configuración Blumi de la tienda');
  }

  if (!data?.value) {
    throw new Error('Blumi: API key no configurada para la tienda');
  }

  return new BlumiClient(decrypt(String(data.value)));
}
