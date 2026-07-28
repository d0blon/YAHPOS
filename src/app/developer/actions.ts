'use server'

import { cookies } from 'next/headers'
import { verifyMasterTOTP } from '@/lib/security'
import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { Store } from '@/types'

const MASTER_ENCRYPTED = process.env.MASTER_KEY_ENCRYPTED || ''

/**
 * Verifica la identidad del desarrollador mediante la contraseña maestra y el código Authy.
 */
export async function verifyDeveloperAccessAction(password: string, code: string) {
  try {
    if (!MASTER_ENCRYPTED) {
      return { success: false, error: 'Configuración maestra no encontrada' }
    }

    const isValid = await verifyMasterTOTP(code, MASTER_ENCRYPTED, password)

    if (isValid) {
      // Establecer una cookie de sesión para el modo developer (expira en 2 horas)
      const cookieStore = await cookies()
      cookieStore.set('dev_token', 'patagonia_dev_active', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 2,
        path: '/'
      })

      return { success: true }
    }

    return { success: false, error: 'Código o contraseña incorrectos' }
  } catch (e: any) {
    console.error("Action error:", e)
    return { success: false, error: e.message || 'Error de servidor' }
  }
}

/**
 * Obtiene la configuración actual de la tienda (SaaS).
 */
export async function getStoreSettingsAction(explicitStoreId?: string | null) {
  const supabase = await createClient()
  
  if (explicitStoreId === null) {
    return null // Retornar explícitamente null para evitar el fallback (ej. dominio raíz)
  }

  // 1. Priorizar storeId explícito
  if (explicitStoreId) {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, slug, tier, config, is_active')
      .eq('id', explicitStoreId)
      .single()
    if (!error) return data
  }

  // 2. Fallback: Intentar obtener el store_id del usuario actual (cuando explicitStoreId === undefined)
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }

  // Buscar membresía activa en user_stores
  const { data: membership } = await supabase
    .from('user_stores')
    .select('store_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  
  if (membership?.store_id) {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, slug, tier, config, is_active')
      .eq('id', membership.store_id)
      .maybeSingle()
      
    if (!error) return data
  }

  return null
}

/**
 * Actualiza la configuración de una tienda específica.
 */
export async function updateStoreSettingsAction(storeId: string, settings: any) {
  const supabase = await createClient()
  
  // Mapear los ajustes al campo config de la tabla stores
  const { error } = await supabase
    .from('stores')
    .update({ 
      config: settings,
      name: settings.store_name || undefined // Sincronizar nombre si viene en settings
    })
    .eq('id', storeId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/developer')
  return { success: true }
}

/**
 * Elimina un negocio y sus configuraciones.
 */
export async function deleteStoreAction(storeId: string) {
  const supabase = await createClient()
  
  try {
    // 1. Eliminar store (la tabla store_settings ya no se usa, y stores tiene cascada)
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', storeId)

    if (error) throw error

    revalidatePath('/developer')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Cita de sesión de desarrollador.
 */
export async function logoutDeveloperAction() {
  const cookieStore = await cookies()
  cookieStore.delete('dev_token')
  return { success: true }
}

/**
 * Obtiene todos los negocios (tenants) registrados.
 */
export async function listStoresAction() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching stores:', error)
    return []
  }
  return data || []
}

import { DEVELOPER_EMAILS } from '@/lib/constants'

/**
 * Crea un nuevo negocio (tenant) y sus ajustes iniciales.
 */
export async function createStoreAction(storeData: { 
  name: string, 
  slug: string, 
  tier: string,
  owner_email: string,
  contact_phone: string,
  address: string,
  city: string,
  payment_months: number
}) {

  const supabase = await createClient()
  
  try {
    // 1. Obtener el merchant_id del usuario actual
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Usuario no autenticado')

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (merchantError || !merchant) {
      throw new Error('Cuenta de comerciante no encontrada. Por favor, contacte a soporte.')
    }

    // 2. Crear el registro del negocio vinculado al merchant_id
    const { data: newStore, error: storeError } = await supabase
      .from('stores')
      .insert({
        name: storeData.name,
        slug: storeData.slug,
        tier: storeData.tier,
        merchant_id: merchant.id,
        owner_email: storeData.owner_email,
        contact_phone: storeData.contact_phone,
        address: storeData.address,
        city: storeData.city,
        payment_months: storeData.payment_months,
        next_payment_date: new Date(new Date().setMonth(new Date().getMonth() + storeData.payment_months)).toISOString().split('T')[0],
        is_active: true
      })

      .select()
      .single()

    if (storeError) throw storeError

    // 3. Asignación automática de roles
    // 3.1. Al creador se le asigna el rol 'owner' y se vincula a la tienda
    await supabase
      .from('profiles')
      .update({ 
        role: 'owner',
        store_id: newStore.id 
      })
      .eq('id', user.id)

    // 3.2. A los correos de soporte se les asigna el rol 'developer'
    if (DEVELOPER_EMAILS.length > 0) {
      await supabase
        .from('profiles')
        .update({ role: 'developer' })
        .in('email', DEVELOPER_EMAILS)
    }

    // 3.3. Asignación automática del dueño si existe el perfil
    if (storeData.owner_email) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', storeData.owner_email)
        .single()
      
      if (ownerProfile) {
        await supabase
          .from('profiles')
          .update({ 
            role: 'admin', // O 'owner' según preferencia
            store_id: newStore.id 
          })
          .eq('id', ownerProfile.id)
      }
    }

    // 4. Registrar transacción inicial (Ingreso)
    const UF_VALUE = 38000 // Valor referencial actual
    const IVA = 1.19
    const tierPricesUF: Record<string, number> = { 
      austral: 1.0, 
      archipielago: 1.5, 
      patagonia: 2.5 
    }
    
    const basePrice = tierPricesUF[storeData.tier] || 0
    const priceWithIva = Math.round(basePrice * UF_VALUE * IVA)
    const amount = priceWithIva * storeData.payment_months
    
    if (amount > 0) {
      await supabase.from('admin_finances').insert({
        store_id: newStore.id,
        amount: amount,
        type: 'income',
        description: `Pago inicial ${storeData.payment_months} meses - Plan ${storeData.tier.charAt(0).toUpperCase() + storeData.tier.slice(1)} (${tierPricesUF[storeData.tier]} UF + IVA)`
      })
    }


    revalidatePath('/developer')
    return { success: true, store: newStore }
  } catch (error: any) {
    console.error('Error creating store:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Ejecuta la suite de certificación SII para una tienda.
 */
export async function runSiiCertificationAction(storeId: string, realMode: boolean = false) {
  const { SiiEngine } = await import('@/lib/sii/engine')
  const engine = new SiiEngine()
  const results: {
    desc: string
    success: boolean
    folio?: number
    documentId?: string
    trackId?: string | null
    error?: string
  }[] = []

  try {
    await engine.initForStore(storeId)

    const tests = [
      { tipo: 39, desc: "Boleta Electrónica Afecta" },
      { tipo: 41, desc: "Boleta Electrónica Exenta" },
      { tipo: 33, desc: "Factura Electrónica Afecta" },
      { tipo: 33, desc: "Factura Electrónica (Cliente Empresa)", receptor: { rut: "77777777-7", razon: "Empresa de Pruebas SpA", giro: "Servicios", dir: "Calle Falsa 123" } },
      { tipo: 52, desc: "Guía de Despacho (Traslado)" },
      { tipo: 61, desc: "Nota de Crédito (Anula Factura)", ref: { tipo: 33, folio: 1, fch: new Date().toISOString().split('T')[0], razon: "ANULACION POR ERROR" } },
      { tipo: 61, desc: "Nota de Crédito (Corrige Texto)", ref: { tipo: 33, folio: 2, fch: new Date().toISOString().split('T')[0], razon: "CORRIGE DIRECCION", cod: 2 } },
      { tipo: 56, desc: "Nota de Débito (Aumento de Intereses)", ref: { tipo: 33, folio: 1, fch: new Date().toISOString().split('T')[0], razon: "INTERESES POR MORA" } },
      { tipo: 33, desc: "Factura con Descuento Global", descGral: 10 },
      { tipo: 39, desc: "Boleta con múltiples ítems", multiItem: true },
      { tipo: 39, desc: "Boleta con Caracteres Especiales (ñ, á, é, í, ó, ú)", specialChars: true }
    ]

    for (const test of tests) {
      const payload: any = {
        Encabezado: {
          TipoDTE: test.tipo as 33 | 34 | 39 | 41 | 46 | 52 | 56 | 61,
          Folio: 0,
          FchEmis: new Date().toISOString().split('T')[0],
          MntTotal: test.tipo === 41 ? 1000 : 1190,
          MntExe: test.tipo === 41 ? 1000 : 0,
          RUTRecep: (test as any).receptor?.rut || '66666666-6',
          RznSocRecep: (test as any).receptor?.razon,
          GiroRecep: (test as any).receptor?.giro,
          DirRecep: (test as any).receptor?.dir,
          Referencias: (test as any).ref ? [
            {
              TpoDocRef: (test as any).ref.tipo,
              FolioRef: (test as any).ref.folio,
              FchRef: (test as any).ref.fch,
              RazonRef: (test as any).ref.razon,
              CodRef: (test as any).ref.cod
            }
          ] : undefined
        },
        Detalles: (test as any).multiItem ? [
          { NmbItem: 'Item 1', QtyItem: 1, PrcItem: 500, MontoItem: 500 },
          { NmbItem: 'Item 2', QtyItem: 1, PrcItem: 500, MontoItem: 500 }
        ] : (test as any).specialChars ? [
          {
            NmbItem: `Producto con Ñandú y Acción`,
            QtyItem: 1,
            PrcItem: 1000,
            MontoItem: 1000
          }
        ] : [
          {
            NmbItem: `Producto ${test.desc}`,
            QtyItem: 1,
            PrcItem: 1000,
            MontoItem: 1000,
            IndExe: test.tipo === 41 ? 1 : undefined
          }
        ]
      }

      const emission = await engine.emitirDocumento(payload, storeId, { test: !realMode })
      
      let trackId = null
      if (emission.success) {
        const envio = await engine.enviarDocumentoAlSII(emission.documentId!, storeId)
        if (envio.success) trackId = (envio as any).trackId
      }

      results.push({
        desc: test.desc,
        success: emission.success,
        folio: emission.folio,
        documentId: emission.documentId,
        trackId,
        error: emission.error
      })
    }

    return { success: true, results }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Obtiene todos los negocios con su estado de facturación y suscripción.
 * Usado en el Developer Command Center.
 */
export async function getStoresWithStatusAction() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, slug, tier, is_active, payment_status, next_payment_date, owner_email, contact_phone, city, address, created_at')
    .order('created_at', { ascending: false })


  if (error) {
    console.error('Error fetching stores with status:', error)
    return [] as Store[]
  }
  return (data as Store[]) || []
}

/**
 * Actualiza el plan y estado de facturación de un negocio específico.
 */
export async function updateStoreBillingAction(storeId: string, data: { tier?: string, next_payment_date?: string | null, payment_status?: string }) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('stores')
    .update(data)
    .eq('id', storeId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/developer')
  return { success: true }
}

/**
 * Obtiene logs reales de actividad del sistema para el Monitor Real.
 */
export async function getRealLogsAction(storeId?: string) {
  const supabase = await createClient()
  
  try {
    // 1. Logs de SII (Emisiones)
    let siiQuery = supabase
      .from('sii_logs')
      .select('id, store_id, event_type, message, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (storeId && storeId !== 'ALL') {
      siiQuery = siiQuery.eq('store_id', storeId)
    }

    const { data: siiLogs } = await siiQuery

    // 2. Logs de creación de tiendas (audit simple)
    let storeQuery = supabase
      .from('stores')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (storeId && storeId !== 'ALL') {
      storeQuery = storeQuery.eq('id', storeId)
    }

    const { data: storeLogs } = await storeQuery

    const formattedLogs = [
      ...(siiLogs || []).map(l => ({
        id: l.id,
        timestamp: l.created_at,
        type: l.event_type === 'ERROR' ? 'ERROR' as const : 'SUCCESS' as const,
        message: `SII [Tienda ${l.store_id.slice(0,5)}]: ${l.message}`,
        category: 'BILLING'
      })),
      ...(storeLogs || []).map(l => ({
        id: l.id,
        timestamp: l.created_at,
        type: 'INFO' as const,
        message: `Sistema: Actividad de negocio detectada - ${l.name}`,
        category: 'AUDIT'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return formattedLogs
  } catch (err) {
    console.error("Error fetching real logs:", err)
    return []
  }
}

/**
 * Obtiene estadísticas financieras detalladas del administrador.
 */
export async function getFinancialStatsAction() {
  const supabase = await createClient()
  
  try {
    const { data: transactions, error } = await supabase
      .from('admin_finances')
      .select('amount, type, created_at')
      .order('created_at', { ascending: true })

    if (error) throw error

    const income = (transactions || [])
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    
    const expense = (transactions || [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // Agrupar por mes para gráficos futuros
    const monthlyData: Record<string, { income: number, expense: number }> = {}
    transactions?.forEach(t => {
      const month = new Date(t.created_at).toLocaleString('es-CL', { month: 'short' })
      if (!monthlyData[month]) monthlyData[month] = { income: 0, expense: 0 }
      if (t.type === 'income') monthlyData[month].income += Number(t.amount)
      else monthlyData[month].expense += Number(t.amount)
    })

    return {
      income,
      expense,
      profit: income - expense,
      monthlyData: Object.entries(monthlyData).map(([name, data]) => ({ name, ...data })),
      simulated: (transactions || []).length === 0
    }
  } catch (err) {
    console.error("Error in financial stats:", err)
    return { income: 0, expense: 0, profit: 0, monthlyData: [], error: true }
  }
}

/**
 * Registra un gasto administrativo (ej. infraestructura, APIs).
 */
export async function recordAdminExpenseAction(data: { amount: number, description: string }) {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase.from('admin_finances').insert({
      amount: data.amount,
      type: 'expense',
      description: data.description
    })

    if (error) throw error
    
    revalidatePath('/developer')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Actualiza los dominios (subdominio y dominio personalizado) de una tienda.
 */
export async function updateStoreDomainsAction(storeId: string, subdomain: string | null, customDomain: string | null) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('stores')
    .update({ 
      subdomain: subdomain?.toLowerCase() || null,
      custom_domain: customDomain?.toLowerCase() || null,
      domain_verified: false // Reset verification if domain changes
    })
    .eq('id', storeId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/developer')
  return { success: true }
}

/**
 * Verifica la configuración DNS de un dominio personalizado.
 */
export async function verifyDnsAction(storeId: string, domain: string) {
  try {
    // En una implementación real, aquí llamaríamos a un resolver DNS o a nuestra API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/verify-dns?domain=${domain}`)
    const data = await response.json()
    
    if (data.valid) {
      const supabase = await createClient()
      await supabase
        .from('stores')
        .update({ domain_verified: true })
        .eq('id', storeId)
      
      revalidatePath('/developer')
      return { success: true, message: 'DNS Verificado correctamente' }
    }
    
    return { success: false, error: 'La verificación falló. Asegúrate de configurar el CNAME correctamente.' }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Cambia el entorno del SII (certificación vs producción) para una tienda.
 */
export async function toggleSiiEnvironmentAction(storeId: string, environment: 'certification' | 'production') {
  const supabase = await createClient()
  
  try {
    const { data: store } = await supabase
      .from('stores')
      .select('config')
      .eq('id', storeId)
      .single()

    if (!store) throw new Error('Tienda no encontrada')

    const newConfig = {
      ...(store.config || {}),
      sii_environment: environment
    }

    const { error } = await supabase
      .from('stores')
      .update({ config: newConfig })
      .eq('id', storeId)

    if (error) throw error

    revalidatePath('/developer')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Genera el PDF de un DTE específico para previsualización o descarga.
 */
export async function generateDtePdfAction(documentId: string) {
  const supabase = await createClient()
  
  try {
    const { data: doc, error } = await supabase
      .from('sii_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error || !doc) throw new Error('Documento no encontrado')

    // Re-parsear el XML para obtener los datos necesarios para el PDF
    const { XMLParser } = await import('fast-xml-parser')
    const parser = new XMLParser()
    const jsonObj = parser.parse(doc.xml_content)
    const dte = jsonObj.DTE.Documento

    const { generateBoletaPdf } = await import('@/lib/sii/pdf-generator')
    
    // Mapear XML a BoletaPdfData
    const pdfData = {
      folio: dte.Encabezado.IdDoc.Folio,
      fecha: dte.Encabezado.IdDoc.FchEmis,
      total: dte.Encabezado.Totales.MntTotal,
      items: Array.isArray(dte.Detalle) ? dte.Detalle.map((i: any) => ({
        nombre: i.NmbItem,
        cantidad: i.QtyItem,
        precio: i.PrcItem,
        total: i.MontoItem
      })) : [{
        nombre: dte.Detalle.NmbItem,
        cantidad: dte.Detalle.QtyItem,
        precio: dte.Detalle.PrcItem,
        total: dte.Detalle.MontoItem
      }],
      emisor: {
        razonSocial: dte.Encabezado.Emisor.RznSoc,
        rut: dte.Encabezado.Emisor.RUTEmisor,
        giro: dte.Encabezado.Emisor.GiroEmis,
        direccion: dte.Encabezado.Emisor.DirOrigen
      },
      timbre: doc.xml_content.match(/<TED.*?>[\s\S]*?<\/TED>/)?.[0] || undefined
    }

    const pdfBytes = await generateBoletaPdf(pdfData as any)
    
    return { 
      success: true, 
      pdfBase64: Buffer.from(pdfBytes).toString('base64'),
      filename: `${doc.tipo_dte}_F${doc.folio}.pdf`
    }

  } catch (err: any) {
    console.error('Error generando PDF:', err)
    return { success: false, error: err.message }
  }
}

// ============================================================================
// MASTER CATALOG SUBMISSIONS (Fase C)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function verifyDeveloperRole(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'developer') throw new Error('No autorizado. Se requiere rol developer.')
}

export async function getPendingMasterCatalogSubmissionsAction() {
  const supabase = await createClient()
  try {
    await verifyDeveloperRole(supabase)
    const adminClient = await import('@/lib/supabase').then(m => m.createAdminClient())
    const { data, error } = await adminClient
      .from('master_catalog_submissions')
      .select('id, sku, name, brand, category, description, image_url, status, created_at, stores ( name )')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}

export async function approveMasterCatalogSubmissionAction(id: string, editedData: Record<string, unknown>) {
  try {
    const supabase = await createClient()
    await verifyDeveloperRole(supabase)
    
    const adminClient = await import('@/lib/supabase').then(m => m.createAdminClient())
    
    // Obtenemos los datos actuales para usar el SKU (que no debería cambiar) o el adminClient puede hacerlo
    const { data: submission, error: fetchErr } = await adminClient
      .from('master_catalog_submissions')
      .select('sku, status')
      .eq('id', id)
      .single()

    if (fetchErr || !submission) throw new Error('Submission no encontrada')
    if (submission.status !== 'pending') throw new Error('Submission ya procesada')

    // Upsert en master_catalog_products
    const { error: upsertErr } = await adminClient
      .from('master_catalog_products')
      .upsert({
        sku: submission.sku,
        name: editedData.name,
        brand: editedData.brand || null,
        category: editedData.category || null,
        description: editedData.description || null,
        image_url: editedData.image_url || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'sku' })

    if (upsertErr) throw upsertErr

    // Marcar como aprobada
    const { error: updateErr } = await adminClient
      .from('master_catalog_submissions')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        name: editedData.name,
        brand: editedData.brand || null,
        category: editedData.category || null,
        description: editedData.description || null,
        image_url: editedData.image_url || null
      })
      .eq('id', id)

    if (updateErr) throw updateErr

    revalidatePath('/developer')
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}

export async function rejectMasterCatalogSubmissionAction(id: string) {
  try {
    const supabase = await createClient()
    await verifyDeveloperRole(supabase)
    const adminClient = await import('@/lib/supabase').then(m => m.createAdminClient())

    const { error } = await adminClient
      .from('master_catalog_submissions')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/developer')
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}

export async function importEnrichedMasterCatalogSubmissionsAction(enrichedItems: Record<string, unknown>[]) {
  try {
    const supabase = await createClient()
    await verifyDeveloperRole(supabase)
    const adminClient = await import('@/lib/supabase').then(m => m.createAdminClient())

    let updatedCount = 0
    for (const item of enrichedItems) {
      if (!item.id) continue
      
      // Update only the provided fields in the submission
      const payload: Record<string, unknown> = {}
      if (item.name !== undefined) payload.name = item.name
      if (item.brand !== undefined) payload.brand = item.brand
      if (item.category !== undefined) payload.category = item.category
      if (item.description !== undefined) payload.description = item.description
      if (item.image_url !== undefined) payload.image_url = item.image_url

      if (Object.keys(payload).length > 0) {
        const { error } = await adminClient
          .from('master_catalog_submissions')
          .update(payload)
          .eq('id', item.id)
          .eq('status', 'pending')

        if (!error) updatedCount++
      }
    }

    revalidatePath('/developer')
    return { success: true, updatedCount }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}
