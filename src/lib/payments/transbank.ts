import { WebpayPlus, Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from 'transbank-sdk';
import { createAdminClient } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';

/**
 * Transbank/Webpay credentials are per-store secrets stored encrypted in
 * `settings`. They are read with the service role and decrypted only here,
 * on the server. No process.env.TRANSBANK_* fallback: production fails closed
 * when a store has no configuration.
 */

const COMMERCE_CODE_KEY = 'payment_webpay_commerce_code';
const API_KEY_KEY = 'payment_webpay_api_key';

export async function getTransbankClient(storeId: string) {
  const isProduction = process.env.NODE_ENV === 'production';

  const integrationOptions = () =>
    new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration
    );

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    if (isProduction) throw new Error('Configuración Webpay incompleta para la tienda');
    return new WebpayPlus.Transaction(integrationOptions());
  }

  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .eq('store_id', storeId)
    .in('key', [COMMERCE_CODE_KEY, API_KEY_KEY])
    .limit(2);

  if (error) {
    console.error('[Transbank] No se pudo leer la configuración de la tienda');
    if (isProduction) throw new Error('No se pudo leer la configuración Webpay de la tienda');
    return new WebpayPlus.Transaction(integrationOptions());
  }

  const values = new Map((data ?? []).map((row) => [row.key, row.value]));
  const encryptedCommerceCode = values.get(COMMERCE_CODE_KEY);
  const encryptedApiKey = values.get(API_KEY_KEY);

  if (!encryptedCommerceCode || !encryptedApiKey) {
    if (isProduction) {
      throw new Error('Configuración Webpay incompleta para la tienda');
    }
    return new WebpayPlus.Transaction(integrationOptions());
  }

  try {
    const options = new Options(
      decrypt(String(encryptedCommerceCode)),
      decrypt(String(encryptedApiKey)),
      isProduction ? Environment.Production : Environment.Integration
    );
    return new WebpayPlus.Transaction(options);
  } catch {
    if (isProduction) {
      throw new Error('Configuración Webpay inválida para la tienda');
    }
    return new WebpayPlus.Transaction(integrationOptions());
  }
}
