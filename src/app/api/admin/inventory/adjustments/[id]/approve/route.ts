import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { parseBody } from '@/lib/validations/http'
import { inventoryApproveSchema } from '@/lib/validations/api'

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id: adjustmentId } = params;
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // 1. Validar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single()

    if (!profile?.store_id) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    // 2. Obtener el ajuste de la base de datos y verificar que pertenece a la tienda
    const { data: adjustment, error: findError } = await adminSupabase
      .from('pending_inventory_adjustments')
      .select('id, store_id, invoice_number, supplier_name, items, status, created_at, updated_at')
      .eq('id', adjustmentId)
      .eq('store_id', profile.store_id)
      .single()

    if (findError || !adjustment) {
      return NextResponse.json({ error: 'Ajuste de inventario no encontrado' }, { status: 404 })
    }

    if (adjustment.status !== 'pending') {
      return NextResponse.json({ error: 'Este ajuste ya ha sido procesado' }, { status: 400 })
    }

    // 3. Parsear el cuerpo con los datos finales confirmados por el usuario
    const parsed = await parseBody(req, inventoryApproveSchema)
    if ('error' in parsed) return parsed.error
    const finalItems = parsed.data.items

    let updatedCount = 0

    // 4. Actualizar el stock de cada producto llamando al RPC
    for (const item of finalItems as { barcode: string; quantity: number; name?: string }[]) {
      const { barcode, quantity, name } = item
      if (!barcode || typeof quantity !== 'number' || quantity <= 0) continue

      // Intentar actualizar usando el RPC atómico (usando admin client para bypass de RLS del admin)
      const { data: rowsUpdated, error: updateError } = await adminSupabase.rpc('increment_product_stock', {
        p_store_id: profile.store_id,
        p_sku: barcode,
        p_quantity: quantity
      })

      if (updateError) {
        console.error(`[Approve Adjustment] Error incrementando SKU ${barcode}:`, updateError.message)
      } else if (rowsUpdated > 0) {
        updatedCount++
      }

      // 4.1. Registrar/Actualizar el mapeo de equivalencia si tiene nombre original de factura
      if (name && adjustment.supplier_name) {
        try {
          const { data: matchedProduct } = await adminSupabase
            .from('products')
            .select('id')
            .eq('store_id', profile.store_id)
            .or(`sku.eq.${barcode},barcode.eq.${barcode}`)
            .maybeSingle()

          if (matchedProduct) {
            await adminSupabase
              .from('supplier_product_mappings')
              .upsert({
                store_id: profile.store_id,
                supplier_name: adjustment.supplier_name,
                supplier_product_name: name,
                mapped_product_id: matchedProduct.id,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'store_id,supplier_name,supplier_product_name'
              })
          }
        } catch (mapErr) {
          console.error('[Approve Mapping Learning Error]:', mapErr)
        }
      }
    }

    // 5. Marcar el registro como aprobado y guardar el listado final de ítems cargados
    const { error: updateStatusError } = await adminSupabase
      .from('pending_inventory_adjustments')
      .update({
        status: 'approved',
        items: finalItems,
        updated_at: new Date().toISOString()
      })
      .eq('id', adjustmentId)

    if (updateStatusError) {
      console.error('[Approve Adjustment Status Update Error]:', updateStatusError.message)
      return NextResponse.json({ error: 'Error al actualizar el estado de aprobación' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount
    })
  } catch (error: unknown) {
    console.error('[Approve Adjustment API Error]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
