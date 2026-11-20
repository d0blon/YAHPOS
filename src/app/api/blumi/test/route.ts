import { NextRequest, NextResponse } from 'next/server';
import { getBlumiClient } from '@/lib/blumi/client';
import { withAuth } from '@/lib/api-utils';
import { SII_MANAGEMENT_ROLES, roleIn } from '@/lib/constants/roles';
import { parseBody } from '@/lib/validations/http';
import { blumiTestSchema } from '@/lib/validations/sii';

/**
 * Endpoint de prueba: envía un DTE de prueba a Blumi Sandbox.
 * 
 * ⚠️ REQUIERE configuración previa en portal web de Blumi:
 * 1. Ir a https://dte.blumi.cl
 * 2. Subir certificado .pfx en "Certificado & Folios CAF"
 * 3. Una vez configurado, este endpoint funcionará
 * 
 * POST /api/blumi/test
 * Body: { tipo_dte?: 33 | 39 | 41, monto?: number }
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

    // Construir payload para Blumi
    const folio = Math.floor(Math.random() * 9000) + 1000;
    const fecha = new Date().toISOString().split('T')[0];
    const iva = Math.round(monto * 0.19);
    const neto = monto - iva;

    // Enviar a Blumi Sandbox usando datos de DistribuidoraSSQ (RUT configurado en Blumi)
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

    // Interpretar resultado
    let veredicto = '';
    if (resultadoBlumi.ok && resultadoBlumi.data) {
      veredicto = '✅ DTE emitido exitosamente en sandbox';
    } else if (resultadoBlumi.error?.code === 'CERTIFICADO_FALTANTE' || 
               resultadoBlumi.error?.message?.includes('certificado')) {
      veredicto = '⚠️ Falta certificado: súbelo en el portal web de Blumi (https://dte.blumi.cl → Certificado & Folios CAF)';
    } else {
      veredicto = `❌ Error: ${resultadoBlumi.error?.message || 'desconocido'}`;
    }

    return NextResponse.json({
      success: resultadoBlumi.ok,
      data: {
        folio,
        tipo_dte: tipoDte,
        fecha,
        monto,
        neto,
        iva,
        veredicto,
      },
    });

  } catch (error) {
    console.error('Error en blumi/test:', error);
    return NextResponse.json({
      error: 'Error interno',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

/**
 * GET: verifica conectividad con Blumi Sandbox
 */
export async function GET() {
  try {
    const auth = await withAuth();
    if (auth.error) return auth.error;

    if (!roleIn(auth.profile?.role, SII_MANAGEMENT_ROLES)) {
      return NextResponse.json(
        { error: 'No tienes permiso para gestionar SII' },
        { status: 403 }
      );
    }

    const blumi = await getBlumiClient(auth.storeId);
    
    // Intentar emitir DTE mínimo para verificar API key
    const resultado = await blumi.emitirDte({
      tipo_dte: 39,
      receptor: { rut: '66666666-6', razon_social: 'Test' },
      items: [{ nombre: 'Test', cantidad: 1, precio_unitario: 100 }],
      medio_pago: 1,
    });

    const apiKeyValida = !resultado.error?.message?.includes('API_KEY') &&
                         !resultado.error?.message?.includes('autenticación');

    return NextResponse.json({
      success: true,
      data: {
        api_key_valida: apiKeyValida,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Error al conectar con Blumi',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
