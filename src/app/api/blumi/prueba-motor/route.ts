import { NextRequest, NextResponse } from 'next/server';
import { SiiSigner } from '@/lib/sii/signer';
import { getBlumiClient } from '@/lib/blumi/client';
import { generateBoletaXml } from '@/lib/sii/templates/boleta';
import { DtePayload } from '@/lib/sii/types';
import { decrypt } from '@/lib/crypto';
import { withAuth } from '@/lib/api-utils';
import { SII_MANAGEMENT_ROLES, roleIn } from '@/lib/constants/roles';
import { parseBody } from '@/lib/validations/http';
import { blumiTestSchema } from '@/lib/validations/sii';

/**
 * Prueba REAL del motor: genera DTE con nuestro motor, firma con .pfx real,
 * lo envía a Blumi Sandbox y reporta validación.
 * 
 * POST /api/blumi/prueba-motor
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await withAuth();
    if (auth.error) return auth.error;

    if (!roleIn(auth.profile?.role, SII_MANAGEMENT_ROLES)) {
      return NextResponse.json(
        { error: 'No tienes permiso para gestionar SII' },
        { status: 403 }
      );
    }

    // Obtener configuración SII
    const { data: config } = await auth.supabase
      .from('sii_config')
      .select('certificado_pfx_encrypted, certificado_password_encrypted, rut_emisor, razon_social, giro, direccion, comuna, ciudad, environment')
      .eq('store_id', auth.storeId)
      .limit(1)
      .single();

    if (!config) {
      return NextResponse.json(
        { error: 'No hay configuración SII' },
        { status: 400 }
      );
    }

    if (!config.rut_emisor || !config.razon_social || !config.giro) {
      return NextResponse.json(
        { error: 'Faltan datos del emisor en la configuración SII de la tienda' },
        { status: 400 }
      );
    }

    const parsed = await parseBody(req, blumiTestSchema);
    if ('error' in parsed) return parsed.error;

    const tipoDteRaw = parsed.data.tipo_dte ?? 39;
    const tipoDte = ([33, 39, 41, 52, 56, 61] as const).find((t) => t === tipoDteRaw);
    if (tipoDte === undefined) {
      return NextResponse.json(
        { error: 'tipo_dte no soportado por Blumi' },
        { status: 400 }
      );
    }

    const monto = parsed.data.monto ?? 1000;

    // Verificar que tengamos certificado
    if (!config.certificado_pfx_encrypted || !config.certificado_password_encrypted) {
      return NextResponse.json(
        { error: 'Falta certificado .pfx. Sube uno primero.' },
        { status: 400 }
      );
    }

    // Descifrar certificado
    const pfxBase64 = await decrypt(config.certificado_pfx_encrypted);
    const password = await decrypt(config.certificado_password_encrypted);
    const pfxBuffer = Buffer.from(pfxBase64, 'base64');

    // 1. Generar DTE con nuestro motor (plantilla real)
    const folio = Math.floor(Math.random() * 9000) + 1000;
    const fecha = new Date().toISOString().split('T')[0];
    const iva = Math.round(monto * 0.19);
    const neto = monto - iva;

    const payload: DtePayload = {
      Encabezado: {
        TipoDTE: tipoDte,
        Folio: folio,
        FchEmis: fecha,
        RUTEmisor: config.rut_emisor,
        RUTRecep: '66666666-6',
        RznSocRecep: 'Consumidor Final',
        MntNeto: neto,
        MntTotal: monto,
        IVA: iva,
        TasaIVA: 19,
      },
      Detalles: [
        {
          NmbItem: 'Producto de prueba YAHPOS!',
          QtyItem: 1,
          PrcItem: neto,
          MontoItem: neto,
        },
      ],
    };

    const xmlSinFirma = generateBoletaXml(payload, {
      rutEmisor: config.rut_emisor,
      razonSocial: config.razon_social,
      giro: config.giro,
      direccion: config.direccion || '',
      comuna: config.comuna || '',
      ciudad: config.ciudad || '',
      environment: 'certification',
    });

    // 2. Firmar con nuestro SiiSigner
    const signer = new SiiSigner(pfxBuffer, password);
    const xmlFirmado = signer.signXml(xmlSinFirma, 'Documento');

    // 3. Enviar a Blumi Sandbox
    const blumi = await getBlumiClient(auth.storeId);
    const resultadoBlumi = await blumi.emitirDte({
      tipo_dte: tipoDte,
      folio,
      fecha_emision: fecha,
      receptor: {
        rut: '66666666-6',
        razon_social: 'Consumidor Final',
      },
      items: [
        {
          nombre: 'Producto de prueba YAHPOS!',
          cantidad: 1,
          precio_unitario: neto,
        },
      ],
      medio_pago: 1,
    });

    // 4. Validar timbre con Blumi
    const resultadoTimbre = await blumi.validarTimbre(xmlFirmado);

    const estado = resultadoBlumi.ok && resultadoTimbre.data?.valid
      ? '✅ MOTOR VÁLIDO'
      : resultadoBlumi.ok
      ? '⚠️ XML OK pero timbre inválido'
      : '❌ XML rechazado por Blumi';

    return NextResponse.json({
      success: resultadoBlumi.ok && resultadoTimbre.data?.valid === true,
      folio,
      documentId: resultadoBlumi.data?.id ?? null,
      estado,
    });

  } catch (error) {
    console.error('Error en blumi/prueba-motor:', error);
    return NextResponse.json({
      error: 'Error interno',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
