import 'server-only';

import { normalizarRutEmisor, SiiCafParser } from './caf';
import { encodeCaf } from './caf-store';

export type IngestarCafResultado =
  | { ok: true; data: { tipoDte: number; folioDesde: number; folioHasta: number; totalFolios: number; rutEmisor: string; fechaAutorizacion: string; reutilizado: boolean } }
  | { ok: false; code: string; error: string; details?: string };

const TIPOS_DTE_PERMITIDOS = new Set([33, 39, 41, 52, 56, 61]);

function fallo(code: string, error: string, details?: string): IngestarCafResultado {
  return details ? { ok: false, code, error, details } : { ok: false, code, error };
}

/** Mensajes de PostgREST acotados: nunca se devuelve XML, PEM ni el CAF cifrado. */
function detalleDb(error: { message?: unknown } | null | undefined, accion: string): string {
  const mensaje = typeof error?.message === 'string'
    ? error.message.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
    : '';
  return mensaje
    ? `${accion}: ${mensaje}`
    : `${accion}. Revise la configuración SII de la tienda y las políticas RLS de la tabla.`;
}

/**
 * Política única para cargar un CAF del SII: valida el XML, deriva el RUT emisor
 * del propio CAF cuando la tienda aún no lo tiene y guarda el rango sin
 * resetear folios ya consumidos. Llamar sólo desde servidor.
 *
 * El resultado nunca incluye el XML, la clave privada ni el valor cifrado.
 */
export async function ingestarCaf(params: {
  supabase: import('@supabase/supabase-js').SupabaseClient;
  storeId: string;
  xml: string;
}): Promise<IngestarCafResultado> {
  const { supabase, storeId, xml } = params;

  if (typeof storeId !== 'string' || !storeId.trim()) {
    return fallo('CAF-STORE', 'Falta la tienda destino', 'El store_id debe venir de la sesión, nunca del cliente.');
  }
  if (typeof xml !== 'string' || !xml.trim()) {
    return fallo('CAF-XML', 'No se recibió contenido del CAF', 'Archivo vacío o ilegible.');
  }

  let caf;
  try {
    caf = SiiCafParser.parse(xml);
  } catch {
    return fallo(
      'CAF-XML',
      'El archivo no es un CAF válido del SII',
      'Debe contener AUTORIZACION/CAF/DA con RE, RS, TD, RNG (D y H) y FA. Se aceptan .xml, .dat y sin extensión, con o sin prefijos de namespace.',
    );
  }

  if (!TIPOS_DTE_PERMITIDOS.has(caf.tipoDte)) {
    return fallo(
      'CAF-TIPO',
      `Tipo de DTE no permitido: ${caf.tipoDte}`,
      `Tipos aceptados: ${[...TIPOS_DTE_PERMITIDOS].sort((a, b) => a - b).join(', ')}.`,
    );
  }

  if (!Number.isSafeInteger(caf.desde) || !Number.isSafeInteger(caf.hasta) || caf.desde < 1 || caf.hasta < caf.desde) {
    return fallo(
      'CAF-RANGO',
      'Rango de folios inválido',
      `Se esperaba RNG.D >= 1 y RNG.H >= RNG.D; se recibió ${caf.desde}-${caf.hasta}.`,
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(caf.fecha)) {
    return fallo('CAF-FA', 'Fecha de autorización inválida', `FA debe tener formato AAAA-MM-DD; se recibió "${caf.fecha}".`);
  }

  const rutEmisor = normalizarRutEmisor(caf.rut);
  if (!rutEmisor) {
    return fallo('CAF-RE', 'No se pudo validar el RUT emisor del CAF', 'Revise el tag <RE> del CAF; se espera un RUT chileno con dígito verificador.');
  }

  const razonSocial = (caf.razonSocial ?? '').trim().slice(0, 200);

  const { data: config, error: configError } = await supabase
    .from('sii_config')
    .select('rut_emisor, razon_social')
    .eq('store_id', storeId)
    .maybeSingle();

  if (configError) {
    return fallo('CAF-CONFIG-LEER', 'No se pudo leer la configuración SII de la tienda', detalleDb(configError, 'Consulta a sii_config'));
  }

  const rutConfigurado = normalizarRutEmisor(config?.rut_emisor);
  const razonConfigurada = typeof config?.razon_social === 'string' ? config.razon_social.trim() : '';

  if (rutConfigurado && rutConfigurado !== rutEmisor) {
    return fallo(
      'CAF-RUT',
      'El RUT del CAF no coincide con el emisor configurado',
      `CAF ${rutEmisor} vs configurado ${rutConfigurado}. Cargue el CAF del emisor correcto o corrija sii_config.rut_emisor.`,
    );
  }

  // Sin RUT configurado no hay bloqueo circular con el certificado: el CAF mismo
  // define el emisor. La razón social sólo se completa si también está vacía.
  if (!rutConfigurado) {
    if (config) {
      const cambios: Record<string, string> = { rut_emisor: rutEmisor };
      if (!razonConfigurada && razonSocial) cambios.razon_social = razonSocial;
      const { error } = await supabase
        .from('sii_config')
        .update(cambios)
        .eq('store_id', storeId);
      if (error) {
        return fallo('CAF-CONFIG-GUARDAR', 'No se pudo guardar el RUT emisor del CAF', detalleDb(error, 'Actualización de sii_config'));
      }
    } else {
      const { error } = await supabase
        .from('sii_config')
        .insert({
          store_id: storeId,
          rut_emisor: rutEmisor,
          razon_social: razonSocial,
        });
      if (error) {
        return fallo('CAF-CONFIG-GUARDAR', 'No se pudo crear la configuración SII de la tienda', detalleDb(error, 'Inserción en sii_config'));
      }
    }
  }

  const { data: existente, error: folioError } = await supabase
    .from('sii_folios')
    .select('folio_actual, activo')
    .eq('store_id', storeId)
    .eq('tipo_dte', caf.tipoDte)
    .eq('folio_desde', caf.desde)
    .maybeSingle();

  if (folioError) {
    return fallo('CAF-FOLIOS-LEER', 'No se pudo consultar el CAF existente', detalleDb(folioError, 'Consulta a sii_folios'));
  }

  const reutilizado = Boolean(existente);
  const folioGuardado = existente?.folio_actual;
  const folioActual = reutilizado && folioGuardado != null && Number.isSafeInteger(Number(folioGuardado))
    ? Number(folioGuardado)
    : caf.desde;
  const activo = reutilizado && existente?.activo === false ? false : true;

  let cafCifrado: string;
  try {
    cafCifrado = encodeCaf(xml);
  } catch {
    return fallo('CAF-CIFRADO', 'No se pudo cifrar el CAF', 'Revise SII_ENCRYPTION_KEY en el servidor (debe tener 32 caracteres).');
  }

  const { error: guardarError } = await supabase
    .from('sii_folios')
    .upsert({
      store_id: storeId,
      tipo_dte: caf.tipoDte,
      folio_desde: caf.desde,
      folio_hasta: caf.hasta,
      folio_actual: folioActual,
      caf_xml: cafCifrado,
      fecha_autorizacion: caf.fecha,
      activo,
    }, { onConflict: 'store_id,tipo_dte,folio_desde' });

  if (guardarError) {
    return fallo('CAF-FOLIOS-GUARDAR', 'No se pudo guardar el CAF', detalleDb(guardarError, 'Upsert en sii_folios'));
  }

  return {
    ok: true,
    data: {
      tipoDte: caf.tipoDte,
      folioDesde: caf.desde,
      folioHasta: caf.hasta,
      totalFolios: caf.hasta - caf.desde + 1,
      rutEmisor,
      fechaAutorizacion: caf.fecha,
      reutilizado,
    },
  };
}
