import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { SiiSigner } from '@/lib/sii/signer'
import { generateBoletaXml } from '@/lib/sii/templates/boleta'

const CERTIFICATION_CASES = [
  {
    id: 1,
    name: 'Boleta Afecta Estándar',
    description: 'Venta normal con productos afectos a IVA.',
    tipo: 39,
    payload: {
      Encabezado: { TipoDTE: 39, Folio: 1, FchEmis: new Date().toISOString().split('T')[0], MntTotal: 1190 },
      Detalles: [{ NmbItem: 'Producto de Prueba Afecto', QtyItem: 1, PrcItem: 1000, MontoItem: 1000 }]
    }
  },
  {
    id: 2,
    name: 'Boleta Exenta',
    description: 'Venta de productos no afectos a IVA (DTE 41).',
    tipo: 41,
    payload: {
      Encabezado: { TipoDTE: 41, Folio: 1, FchEmis: new Date().toISOString().split('T')[0], MntTotal: 1000 },
      Detalles: [{ NmbItem: 'Producto de Prueba Exento', QtyItem: 1, PrcItem: 1000, MontoItem: 1000, IndExe: 1 }]
    }
  },
  {
    id: 3,
    name: 'Boleta con Varios Ítems',
    description: 'Venta con múltiples líneas de detalle para validar sumatorias.',
    tipo: 39,
    payload: {
      Encabezado: { TipoDTE: 39, Folio: 2, FchEmis: new Date().toISOString().split('T')[0], MntTotal: 5950 },
      Detalles: [
        { NmbItem: 'Producto A', QtyItem: 2, PrcItem: 1000, MontoItem: 2000 },
        { NmbItem: 'Producto B', QtyItem: 3, PrcItem: 1000, MontoItem: 3000 }
      ]
    }
  },
  {
    id: 4,
    name: 'Boleta Mixta (Afecto + Exento)',
    description: 'Boleta afecta que incluye ítems exentos (DTE 39 con IndExe=1).',
    tipo: 39,
    payload: {
      Encabezado: { TipoDTE: 39, Folio: 3, FchEmis: new Date().toISOString().split('T')[0], MntTotal: 2190 },
      Detalles: [
        { NmbItem: 'Ítem Afecto', QtyItem: 1, PrcItem: 1000, MontoItem: 1000 },
        { NmbItem: 'Ítem Exento', QtyItem: 1, PrcItem: 1000, MontoItem: 1000, IndExe: 1 }
      ]
    }
  }
]

export async function GET() {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single()

    if (!profile?.store_id) return NextResponse.json({ error: 'Sin tienda' }, { status: 403 })

    const { data: dbCases } = await supabase
      .from('sii_certification_cases')
      .select('*')
      .eq('store_id', profile.store_id)
      .order('case_number', { ascending: true })

    // Merge static definitions with DB status
    const merged = CERTIFICATION_CASES.map(c => {
      const dbCase = dbCases?.find(dbc => dbc.case_number === c.id)
      return {
        ...c,
        status: dbCase?.status || 'pending',
        time: dbCase?.updated_at || '-',
        trackId: dbCase?.sii_track_id || null
      }
    })

    return NextResponse.json({ cases: merged })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single()

    if (!profile?.store_id) return NextResponse.json({ error: 'Sin tienda' }, { status: 403 })

    const { caseId } = await req.json()
    const caseDef = CERTIFICATION_CASES.find(c => c.id === caseId)
    if (!caseDef) return NextResponse.json({ error: 'Caso no encontrado' }, { status: 404 })

    // 1. Inicializar motor con configuración real de la tienda
    const { SiiEngine } = await import('@/lib/sii/engine');
    const engine = new SiiEngine();
    
    try {
      await engine.initForStore(profile.store_id);
    } catch (initErr: any) {
      return NextResponse.json({ error: `SII no configurado: ${initErr.message}` }, { status: 400 });
    }

    // 2. Emitir y Firmar Documento Real (obtiene folio de la DB)
    const emissionResult = await engine.emitirBoleta(caseDef.payload as any, profile.store_id);
    
    if (!emissionResult.success) {
      return NextResponse.json({ error: `Error en emisión: ${emissionResult.error}` }, { status: 500 });
    }

    // 3. Enviar al SII para obtener TrackID REAL
    const sendResult: any = await engine.enviarBoletaAlSII(emissionResult.documentId, profile.store_id);

    if (!sendResult.success) {
      return NextResponse.json({ 
        error: `Error en envío al SII: ${sendResult.error}`,
        documentId: emissionResult.documentId 
      }, { status: 500 });
    }

    // 4. Actualizar Estado de Certificación
    await supabase.from('sii_certification_cases').upsert({
      store_id: profile.store_id,
      case_number: caseId,
      status: 'sent',
      xml_sent: emissionResult.xml,
      sii_track_id: sendResult.trackId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'store_id,case_number' });

    return NextResponse.json({ 
      success: true, 
      trackId: sendResult.trackId,
      documentId: emissionResult.documentId
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
