import { NextResponse } from 'next/server';
import { SiiEngine } from '@/lib/sii/engine';
import { createServerClient } from '@/lib/supabase';

export async function POST(req: Request) {
  const supabase = createServerClient();
  
  try {
    const { items, totals, type = 39 } = await req.json();

    // 1. Obtener la sesión del usuario para saber de qué negocio es
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // 2. Cargar configuración del SII (esto debería venir de DB, aquí usamos ENV por ahora)
    const config = {
      rutEmisor: process.env.SII_RUT_EMISOR || '',
      razonSocial: process.env.SII_RAZON_SOCIAL || '',
      giro: process.env.SII_GIRO || '',
      direccion: process.env.SII_DIRECCION || '',
      comuna: process.env.SII_COMUNA || '',
      ciudad: process.env.SII_CIUDAD || '',
      pfxPath: process.env.SII_CERT_PATH,
      pfxPassword: process.env.SII_CERT_PASSWORD,
      environment: (process.env.SII_ENVIRONMENT as any) || 'certification'
    };

    const engine = new SiiEngine(config);

    // 3. Obtener el próximo Folio (Lógica simplificada: aquí deberíamos consultar la tabla sii_folios)
    // Por ahora usaremos un timestamp para que no se repita en pruebas
    const nextFolio = Math.floor(Date.now() / 100000);

    // 4. Preparar Payload para el motor
    const payload = {
      Encabezado: {
        TipoDTE: type,
        Folio: nextFolio,
        FchEmis: new Date().toISOString().split('T')[0],
        MntTotal: totals.total,
      },
      Detalles: items.map((item: any) => ({
        NmbItem: item.name,
        QtyItem: item.quantity,
        PrcItem: item.price,
        MontoItem: item.price * item.quantity
      }))
    };

    // 5. Emitir y Firmar
    const result = await engine.emitirBoleta(payload, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      folio: result.folio,
      message: 'Boleta emitida y firmada correctamente',
      trackId: 'SIMULADO-' + Date.now() // En producción aquí irá el TrackID real del SII
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
