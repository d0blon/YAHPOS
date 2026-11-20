'use server'

import { createClient, createAdminClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { Store } from '@/types'
import { DEVELOPER_EMAILS } from '@/lib/constants'
import { verifyDeveloperRole } from './_shared'
import { getRootOrigin } from '@/lib/config/root-origin'

/**
 * Crea una nueva tienda (tenant) y sus ajustes iniciales.
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
    await verifyDeveloperRole(supabase)

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

    // 2. Crear el registro de la tienda vinculado al merchant_id
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

      .select('id, name, slug, tier, is_active, created_at, tier_id, config, next_payment_date, payment_status, merchant_id, owner_email, owner_name, contact_phone, address, city, payment_months, subdomain, custom_domain, commune, region, is_demo')
      .single()

    if (storeError) throw storeError

    // 3. Asignación automática de roles
    // 3.1. Al creador se le asigna el rol 'owner' y se vincula a la tienda
    const adminSupabase = createAdminClient()
    await adminSupabase
      .from('profiles')
      .update({ 
        role: 'owner',
        store_id: newStore.id 
      })
      .eq('id', user.id)

    // 3.2. A los correos de soporte se les asigna el rol 'developer'
    if (DEVELOPER_EMAILS.length > 0) {
      await adminSupabase
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
        await adminSupabase
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
      const { error: financeError } = await adminSupabase.from('admin_finances').insert({
        store_id: newStore.id,
        amount: amount,
        type: 'income',
        description: `Pago inicial ${storeData.payment_months} meses - Plan ${storeData.tier.charAt(0).toUpperCase() + storeData.tier.slice(1)} (${tierPricesUF[storeData.tier]} UF + IVA)`
      })
      if (financeError) throw financeError
    }


    revalidatePath('/developer')
    return { success: true, store: newStore }
  } catch (error) {
    console.error('Error creating store:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error de servidor' }
  }
}

/**
 * Obtiene todas las tiendas con su estado de facturación y suscripción.
 * Usado en el Developer Command Center.
 */
export async function getStoresWithStatusAction() {
  const supabase = await createClient()

  try {
    await verifyDeveloperRole(supabase)
  } catch {
    return [] as Store[]
  }

  const { data, error } = await supabase
    .from('stores')
    .select('id, name, slug, tier, is_active, payment_status, next_payment_date, owner_email, contact_phone, city, address, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching stores with status:', error)
    return [] as Store[]
  }

  const stores = (data as Store[]) || []
  if (stores.length === 0) return stores

  // Contar sucursales por tienda en una sola query
  const { data: allBranches } = await supabase
    .from('branches')
    .select('id, store_id, name, is_active')
    .in('store_id', stores.map(s => s.id))
    .order('name')

  const branchesByStore: Record<string, { id: string, name: string, is_active: boolean }[]> = {}
  for (const b of allBranches || []) {
    if (!branchesByStore[b.store_id]) branchesByStore[b.store_id] = []
    branchesByStore[b.store_id].push({ id: b.id, name: b.name, is_active: b.is_active })
  }

  return stores.map(s => ({ ...s, branches: branchesByStore[s.id] || [] }))
}

/**
 * Actualiza los dominios (subdominio y dominio personalizado) de una tienda.
 */
export async function updateStoreDomainsAction(storeId: string, subdomain: string | null, customDomain: string | null) {
  const supabase = await createClient()

  try {
    await verifyDeveloperRole(supabase)
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error de servidor' }
  }

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
  let rootOrigin: string
  try {
    rootOrigin = getRootOrigin()
  } catch {
    return { success: false, error: 'NEXT_PUBLIC_ROOT_ORIGIN no está configurado' }
  }

  try {
    const supabase = await createClient()
    await verifyDeveloperRole(supabase)

    const verifyUrl = new URL('/api/verify-dns', rootOrigin)
    verifyUrl.searchParams.set('domain', domain)

    const response = await fetch(verifyUrl)
    if (!response.ok) {
      return { success: false, error: 'La verificación falló. Asegúrate de configurar el CNAME correctamente.' }
    }

    const data: unknown = await response.json()
    const isValid = typeof data === 'object' && data !== null && 'valid' in data && data.valid === true

    if (isValid) {
      await supabase
        .from('stores')
        .update({ domain_verified: true })
        .eq('id', storeId)

      revalidatePath('/developer')
      return { success: true, message: 'DNS Verificado correctamente' }
    }

    return { success: false, error: 'La verificación falló. Asegúrate de configurar el CNAME correctamente.' }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error de servidor' }
  }
}
