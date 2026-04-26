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
      Encabezado: {
        TipoDTE: 39,
        Folio: 1,
        FchEmis: new Date().toISOString().split('T')[0],
        MntTotal: 1190,
      },
      Detalles: [
        {
          NmbItem: 'Producto de Prueba Afecto',
          QtyItem: 1,
          PrcItem: 1000,
          MontoItem: 1000,
        }
      ]
    }
  },
  {
    id: 2,
    name: 'Boleta Exenta',
    description: 'Venta de productos no afectos a IVA.',
    tipo: 41,
    payload: {
      Encabezado: {
        TipoDTE: 41,
        Folio: 1,
        FchEmis: new Date().toISOString().split('T')[0],
        MntTotal: 1000,
      },
      Detalles: [
        {
          NmbItem: 'Producto de Prueba Exento',
          QtyItem: 1,
          PrcItem: 1000,
          MontoItem: 1000,
        }
      ]
    }
  },
  {
    id: 3,
    name: 'Boleta con Descuento Global',
    description: 'Venta con un descuento aplicado al total.',
    tipo: 39,
    payload: {
      Encabezado: {
        TipoDTE: 39,
        Folio: 2,
        FchEmis: new Date().toISOString().split('T')[0],
        MntTotal: 952,
      },
      Detalles: [
        {
          NmbItem: 'Producto Afecto con Descuento Global',
          QtyItem: 1,
          PrcItem: 1000,
          MontoItem: 1000,
        }
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

    // 1. Get SII Settings for signing
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .eq('store_id', profile.store_id)
      .in('key', ['sii_rut', 'sii_razon_social', 'sii_giro', 'sii_direccion', 'sii_comuna', 'sii_certificate', 'sii_certificate_password'])

    const sii = Object.fromEntries(settings?.map(s => [s.key, s.value]) || [])
    
    if (!sii.sii_certificate || !sii.sii_certificate_password) {
      return NextResponse.json({ error: 'Certificado digital no configurado' }, { status: 400 })
    }

    // 2. Generate and Sign XML
    const config = {
      rutEmisor: sii.sii_rut,
      razonSocial: sii.sii_razon_social,
      giro: sii.sii_giro,
      direccion: sii.sii_direccion,
      comuna: sii.sii_comuna,
      ciudad: sii.sii_comuna, // Fallback
      environment: 'certification' as const,
    }

    const xml = generateBoletaXml(caseDef.payload as any, config)
    
    // In a real scenario, we would sign here
    // const signer = new SiiSigner(sii.sii_certificate, sii.sii_certificate_password)
    // const signedXml = signer.signXml(xml, 'Documento')
    
    // For SIMULATION in development:
    const signedXml = xml // Mock signed XML
    const trackId = `SIM-${Math.random().toString(36).substring(7).toUpperCase()}`

    // 3. Update DB
    await supabase.from('sii_certification_cases').upsert({
      store_id: profile.store_id,
      case_number: caseId,
      status: 'accepted',
      xml_sent: signedXml,
      sii_track_id: trackId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'store_id,case_number' })

    return NextResponse.json({ success: true, trackId })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
