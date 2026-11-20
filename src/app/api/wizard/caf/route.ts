import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { SII_MANAGEMENT_ROLES, roleIn } from '@/lib/constants/roles';
import { ingestarCaf } from '@/lib/sii/caf-ingest';

const MAX_CAF_BYTES = 10 * 1024 * 1024;

/** Fallos de infraestructura/configuración del servidor, no del archivo recibido. */
const ERRORES_SERVIDOR = new Set([
  'CAF-STORE',
  'CAF-CONFIG-LEER',
  'CAF-CONFIG-GUARDAR',
  'CAF-FOLIOS-LEER',
  'CAF-CIFRADO',
  'CAF-FOLIOS-GUARDAR',
]);

/**
 * Decodifica los bytes del CAF sin alterar el fragmento <CAF> firmado: quita BOM
 * UTF-8 y respeta encoding ISO-8859-1/windows-1252 declarado en el XML.
 */
function decodificarCaf(bytes: ArrayBuffer): string {
  const buffer = Buffer.from(bytes);
  const cuerpo = buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF
    ? buffer.subarray(3)
    : buffer;
  const cabecera = cuerpo.toString('latin1', 0, Math.min(cuerpo.length, 512));
  const esLatin1 = /<\?xml[^>]*\bencoding\s*=\s*["']?(?:ISO[-_]?8859[-_]?(?:1|15)|windows[-_]?1252|latin[-_]?1)["']?/i.test(cabecera);
  return esLatin1 ? cuerpo.toString('latin1') : cuerpo.toString('utf8');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) {
      return NextResponse.json(
        { error: 'Perfil sin tienda', code: 'CAF-STORE', details: 'La sesión no tiene una tienda asociada.' },
        { status: 400 }
      );
    }

    if (!roleIn(profile.role, SII_MANAGEMENT_ROLES)) {
      return NextResponse.json(
        { error: 'No tienes permiso para gestionar la configuración SII' },
        { status: 403 }
      );
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'FormData inválido', code: 'CAF-XML', details: 'No se pudo leer el archivo enviado.' },
        { status: 400 }
      );
    }

    const caf = form.get('caf');
    if (!(typeof File !== 'undefined' && caf instanceof File) || caf.size === 0) {
      return NextResponse.json(
        { error: 'No se recibió contenido del CAF', code: 'CAF-XML', details: 'Archivo vacío o ilegible.' },
        { status: 400 }
      );
    }
    if (caf.size > MAX_CAF_BYTES) {
      return NextResponse.json(
        { error: 'El archivo CAF no puede superar los 10MB', code: 'CAF-XML', details: 'Tamaño máximo permitido: 10MB.' },
        { status: 400 }
      );
    }

    const xml = decodificarCaf(await caf.arrayBuffer());
    const result = await ingestarCaf({ supabase, storeId: profile.store_id, xml });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code, details: result.details ?? '' },
        { status: ERRORES_SERVIDOR.has(result.code) ? 500 : 400 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Error en wizard/caf:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
