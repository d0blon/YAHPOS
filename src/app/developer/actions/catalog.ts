'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

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

export async function getApprovedMasterCatalogProductsAction(search?: string, page: number = 0) {
  const supabase = await createClient()
  const PAGE_SIZE = 50
  let query = supabase.from('master_catalog_products').select('*', { count: 'exact' }).order('name')
  if (search) query = query.ilike('name', `%${search}%`)
  const { data, error, count } = await query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
  if (error) return { success: false, error: error.message }
  return { success: true, data, total: count ?? 0, page, pageSize: PAGE_SIZE }
}
