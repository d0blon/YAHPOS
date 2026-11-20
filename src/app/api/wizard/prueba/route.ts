import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { SiiEngine } from '@/lib/sii/engine';
import { DtePayload } from '@/lib/sii/types';
import { SII_MANAGEMENT_ROLES, roleIn } from '@/lib/constants/roles';

/**
 * Emite un DTE de prueba para validar que la configuración esté completa.
 * 
 * Este endpoint:
 * 1. Verifica que haya certificado, CAF y resolución configurados
 * 2. Genera un DTE de prueba (boleta tipo 39 por $1.000)
 * 3. Marca el DTE como test en metadata (no se envía al SII)
 * 4. Devuelve el resultado para mostrar feedback al usuario
 */
export async function POST() {
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
      return NextResponse.json({ error: 'Perfil sin tienda' }, { status: 400 });
    }

    if (!roleIn(profile.role, SII_MANAGEMENT_ROLES)) {
      return NextResponse.json(
        { error: 'No tienes permiso para gestionar la configuración SII' },
        { status: 403 }
      );
    }

    // Verificar que la configuración esté completa
    const { data: config } = await supabase
      .from('sii_config')
      .select('certificado_pfx_encrypted, nro_resol, fch_resol')
      .eq('store_id', profile.store_id)
      .limit(1)
      .single();

    if (!config) {
      return NextResponse.json(
        { error: 'No hay configuración SII. Completa los pasos anteriores.' },
        { status: 400 }
      );
    }

    // Verificar certificado (columna real; `pfx_encrypted` no existe en sii_config)
    if (!config.certificado_pfx_encrypted) {
      return NextResponse.json(
        { error: 'Falta certificado digital. Sube el .pfx en el paso 1.' },
        { status: 400 }
      );
    }

    // Verificar CAF
    const { data: folios } = await supabase
      .from('sii_folios')
      .select('id')
      .eq('store_id', profile.store_id)
      .eq('activo', true)
      .limit(1);

    if (!folios || folios.length === 0) {
      return NextResponse.json(
        { error: 'Falta CAF (folios). Carga un CAF en el paso 2.' },
        { status: 400 }
      );
    }

    // Verificar resolución
    if (config.nro_resol === null || config.nro_resol === undefined || !config.fch_resol) {
      return NextResponse.json(
        { error: 'Falta resolución SII. Ingresa la resolución en el paso 3.' },
        { status: 400 }
      );
    }

    // Crear DTE de prueba (boleta tipo 39)
    const engine = new SiiEngine();
    await engine.initForStore(profile.store_id);

    // Construir payload de prueba
    const precioUnitario = 1000;
    const cantidad = 1;
    const montoItem = precioUnitario * cantidad;
    const iva = Math.round(montoItem * 0.19);
    const mntTotal = montoItem + iva;

    const payload: DtePayload = {
      Encabezado: {
        TipoDTE: 39,
        Folio: 0, // Se asignará automáticamente
        FchEmis: new Date().toISOString().split('T')[0],
        RUTRecep: '66666666-6',
        RznSocRecep: 'Consumidor Final',
        MntTotal: mntTotal,
        MntNeto: montoItem,
        IVA: iva,
        TasaIVA: 19,
      },
      Detalles: [
        {
          NmbItem: 'Producto de prueba',
          QtyItem: cantidad,
          PrcItem: precioUnitario,
          MontoItem: montoItem,
        },
      ],
    };

    try {
      const resultado = await engine.emitirBoleta(
        payload,
        profile.store_id,
        { test: true } // Marcar como test (no se envía al SII)
      );

      if (!resultado.success) {
        return NextResponse.json(
          { 
            error: 'Error emitiendo DTE de prueba',
            details: resultado.error || 'Error desconocido'
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          folio: resultado.folio,
          mensaje: '✅ DTE de prueba emitido correctamente. Tu configuración está completa.',
        }
      });

    } catch (error) {
      console.error('Error emitiendo DTE de prueba:', error);
      return NextResponse.json(
        { 
          error: 'Error emitiendo DTE de prueba',
          details: error instanceof Error ? error.message : 'Error desconocido'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error en wizard/prueba:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
