import { NextResponse } from 'next/server';
import { SiiEngine } from '@/lib/sii/engine';
import { createClient } from '@/lib/supabase';

export async function POST(req: Request) {
  const supabase = await createClient();
  
  try {
    const { items, totals, type = 39 } = await req.json();

    // 1. Obtener la sesión del usuario para saber de qué negocio es
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // 2. Obtener el store_id del perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) {
      return NextResponse.json({ error: 'Usuario no asociado a ninguna tienda' }, { status: 403 });
    }

    // 3. Inicializar el motor con la configuración de la tienda (desde sii_config)
    const engine = new SiiEngine();
    await engine.initForStore(profile.store_id);

    // 4. Preparar Payload para el motor con lógica dinámica (39 vs 41)
    let mntExe = 0;
    let mntTotal = totals.total;
    let hasAfecto = false;
    let hasExempt = false;

    items.forEach((item: any) => {
      if (item.isExempt) {
        mntExe += Math.round(item.price * item.quantity);
        hasExempt = true;
      } else {
        hasAfecto = true;
      }
    });

    // Decidir tipo de DTE
    let tipoDte = type; // Fallback al recibido
    if (!hasAfecto && hasExempt) {
      tipoDte = 41; // Boleta Exenta si TODO es exento
    } else {
      tipoDte = 39; // Boleta si hay mezcla o solo afecto
    }

    let mntNeto = 0;
    let iva = 0;

    if (tipoDte === 39 && hasAfecto) {
      const baseAfecta = mntTotal - mntExe;
      mntNeto = Math.round(baseAfecta / 1.19);
      iva = baseAfecta - mntNeto;
    } else if (tipoDte === 41) {
      mntExe = mntTotal; // En boleta exenta, el total es el exento
    }

    const payload = {
      Encabezado: {
        TipoDTE: tipoDte as (39 | 41),
        Folio: 0,
        FchEmis: new Date().toISOString().split('T')[0],
        MntNeto: mntNeto > 0 ? mntNeto : undefined,
        MntExe: mntExe > 0 ? mntExe : undefined,
        IVA: iva > 0 ? iva : undefined,
        MntTotal: mntTotal,
      },
      Detalles: items.map((item: any) => ({
        NmbItem: item.name,
        QtyItem: item.quantity,
        PrcItem: item.price,
        MontoItem: item.price * item.quantity,
        IndExe: item.isExempt ? 1 : undefined
      }))
    };

    // 5. Emitir y Firmar
    const result: any = await engine.emitirBoleta(payload, profile.store_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      folio: result.folio,
      documentId: result.documentId,
      message: 'Boleta emitida y firmada correctamente'
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
