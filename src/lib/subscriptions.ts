import { supabase, createAdminClient } from './supabase'

export interface SubscriptionTier {
  id: string
  name: string
  slug: string
  price: number
  features: {
    ecommerce: boolean
    sii: boolean
    inventory: boolean
    api?: boolean
    multibranch?: boolean
    support?: string
  }
  limit_products: number | null
  limit_users: number | null
}

/**
 * Obtiene todos los tiers de suscripción disponibles
 */
export async function getSubscriptionTiers(): Promise<SubscriptionTier[]> {
  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('*')
    .order('price', { ascending: true })

  if (error) {
    console.error('Error fetching tiers:', error)
    return []
  }

  return data as SubscriptionTier[]
}

/**
 * Obtiene el tier actual de una tienda
 */
export async function getStoreSubscription(storeId: string): Promise<SubscriptionTier | null> {
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('tier_id')
    .eq('id', storeId)
    .single()

  if (storeError || !store?.tier_id) {
    console.error('Error fetching store tier:', storeError)
    return null
  }

  const { data: tier, error: tierError } = await supabase
    .from('subscription_tiers')
    .select('*')
    .eq('id', store.tier_id)
    .single()

  if (tierError) {
    console.error('Error fetching tier details:', tierError)
    return null
  }

  return tier as SubscriptionTier
}

/**
 * Verifica si una tienda tiene acceso a una característica específica
 */
export async function checkStoreAccess(storeId: string, feature: keyof SubscriptionTier['features']): Promise<boolean> {
  const tier = await getStoreSubscription(storeId)
  if (!tier) return false

  return !!tier.features[feature]
}

/**
 * Actualiza el tier de una tienda (Requiere permisos de admin/service_role)
 */
export async function upgradeStoreTier(storeId: string, tierSlug: string): Promise<boolean> {
  const admin = createAdminClient()
  
  const { data: tier, error: tierError } = await admin
    .from('subscription_tiers')
    .select('id')
    .eq('slug', tierSlug)
    .single()

  if (tierError || !tier) {
    console.error('Tier not found:', tierSlug)
    return false
  }

  const { error: updateError } = await admin
    .from('stores')
    .update({ 
      tier_id: tier.id,
      tier: tierSlug // Mantener sincronizado por ahora para compatibilidad con middleware
    })
    .eq('id', storeId)

  if (updateError) {
    console.error('Error updating store tier:', updateError)
    return false
  }

  return true
}
