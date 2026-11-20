import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { withAuth } from '@/lib/api-utils'
import { orderSchema } from '@/lib/validations/orders'
import { parseBody } from '@/lib/validations/http'
import { orderPatchSchema } from '@/lib/validations/api'

const ORDER_SELECT = 'id, store_id, user_id, branch_id, total, subtotal, discount, shipping_cost, service_fee, status, payment_method, payment_status, shipping_type, shipping_address_json, address, fulfillment_status, metadata, sii_document_id, sii_status, folio, created_at, updated_at'

/** Violación del índice parcial `orders_store_offline_id_unique` (migración 037). */
function isDuplicateOfflineIdError(error: { code?: string; message?: string } | null): boolean {
  return !!error && error.code === '23505' && /offline_id/i.test(error.message ?? '')
}

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

    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('store_id', profile.store_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsed = await parseBody(req, orderSchema)
    if ('error' in parsed) return parsed.error

    const {
      total,
      discount,
      shipping, 
      serviceFee, 
      shippingType,
      shippingAddress,
      paymentMethod, 
      status,
      customerRut,
      pointsRedeemed = 0,
      items,
      branchId,
      source = 'pos',
      registerId,
      offlineId,
      documentKind,
      siiSkipReason
    } = parsed.data

    if (!total || !paymentMethod) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (total, paymentMethod)' }, { status: 400 })
    }

    // Validar que todos los productos existan ANTES de crear orden/pago -- evita dejar
    // una orden pagada huérfana si algún productId es inválido (ej. IDs del catálogo demo
    // que se filtraron al carrito por error, no numéricos, no existen en esta tienda).
    let realPriceById: Map<string, number> = new Map()

    if (items?.length) {
      const productIds = items.map((i) => i.productId).filter(Boolean)
      if (productIds.length > 0) {
        const { data: existingProducts } = await auth.supabase
          .from('products')
          .select('id, price')
          .eq('store_id', auth.storeId)
          .in('id', productIds)

        const existingIds = new Set((existingProducts || []).map((p) => String(p.id)))
        const missingIds = productIds.filter((id) => !existingIds.has(String(id)))

        if (missingIds.length > 0) {
          return NextResponse.json({ error: `Producto(s) inválido(s): ${missingIds.join(', ')}` }, { status: 400 })
        }

        realPriceById = new Map((existingProducts || []).map((p) => [String(p.id), Number(p.price)]))
      }

      if (source === 'ecommerce') {
        const realSubtotal = items.reduce((sum: number, i) => {
          const price = realPriceById.get(String(i.productId)) ?? 0
          return sum + price * i.quantity
        }, 0)

        // El total no puede ser menor al valor real del carro (sí puede ser mayor por
        // envío/servicio, que hoy siguen calculándose aparte — fuera de alcance de este fix).
        if (total < realSubtotal) {
          console.error('[API /orders] Precio manipulado — total recibido menor al real', { total, realSubtotal })
          return NextResponse.json({ error: 'El total no coincide con el precio real de los productos' }, { status: 400 })
        }
      }
    }

    if (offlineId) {
      const { data: existingOrder } = await auth.supabase
        .from('orders')
        .select(ORDER_SELECT)
        .eq('metadata->>offline_id', offlineId)
        .eq('store_id', auth.storeId)
        .maybeSingle()
      
      if (existingOrder) {
        console.log('[API /orders] Orden duplicada detectada (offlineId=%s), retornando existente', offlineId)
        return NextResponse.json(existingOrder, { status: 200 })
      }
    }

    const { data: settingsData } = await auth.supabase
      .from('settings')
      .select('key, value')
      .eq('store_id', auth.storeId);
    
    const settings: Record<string, string> = {};
    settingsData?.forEach(s => { settings[s.key] = s.value; });

    const loyaltyEnabled = settings.loyalty_enabled === 'true';
    const accumulationRate = parseInt(settings.loyalty_accumulation_rate || '100');
    
    let finalPointsToEarn = 0;
    if (loyaltyEnabled && total > 0) {
      finalPointsToEarn = Math.floor(total / accumulationRate);
    }

    const isEcommerce = source === 'ecommerce'
    
    const { data: order, error: orderError } = await auth.supabase
      .from('orders')
      .insert([{
        user_id: auth.user.id,
        store_id: auth.storeId,
        branch_id: branchId || null,
        total: total,
        discount: discount ?? 0,
        status: status ?? (isEcommerce ? 'pending' : 'completed'),
        address: isEcommerce 
          ? (typeof shippingAddress === 'object' ? shippingAddress?.street : shippingAddress) || 'Envío Online'
          : 'Venta Presencial POS',
        payment_method: paymentMethod,
        payment_status: isEcommerce ? 'pending' : 'paid',
        register_id: registerId ? parseInt(registerId) : null,
        shipping_type: shippingType || (isEcommerce ? 'delivery' : 'pickup'),
        shipping_cost: shipping || 0,
        shipping_address_json: shippingAddress || {},
        fulfillment_status: isEcommerce ? 'pending' : 'delivered',
        service_fee: serviceFee || 0,
        // `no_aplica` (nunca null) distingue al voucher de un DTE pendiente.
        ...(documentKind === 'voucher' ? { sii_status: 'no_aplica' } : {}),
        metadata: {
          offline_id: offlineId || null,
          document_kind: documentKind ?? null,
          sii_skip_reason: siiSkipReason ?? null,
          loyalty: {
            points_earned: finalPointsToEarn,
            points_redeemed: pointsRedeemed || 0,
            accumulation_rate: accumulationRate
          }
        }
      }])
      .select(ORDER_SELECT)
      .single()

    if (orderError) {
      // Carrera entre dos requests con el mismo offline_id: la constraint parcial
      // (migración 037) garantiza una sola fila. Devolvemos la existente, sin
      // re-registrar pago, ítems, stock ni puntos.
      if (offlineId && isDuplicateOfflineIdError(orderError)) {
        const { data: existingOrder } = await auth.supabase
          .from('orders')
          .select(ORDER_SELECT)
          .eq('metadata->>offline_id', offlineId)
          .eq('store_id', auth.storeId)
          .maybeSingle()

        if (existingOrder) {
          console.log('[API /orders] Inserto duplicado por carrera (offlineId=%s), retornando existente', offlineId)
          return NextResponse.json(existingOrder, { status: 200 })
        }
      }
      console.error('[API /orders] Error al crear orden:', orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    // La venta pudo emitir su DTE antes de que existiera esta fila (POS offline que
    // sincroniza después). Se enlaza por el `offline_id`; si la migración 028 todavía
    // no está aplicada el update falla y se registra, sin romper la creación de la orden.
    if (offlineId && documentKind !== 'voucher') {
      const { data: dte } = await auth.supabase
        .from('sii_documents')
        .select('id, folio')
        .eq('store_id', auth.storeId)
        .contains('metadata', { offline_id: offlineId })
        .maybeSingle()

      if (dte) {
        const { error: linkError } = await auth.supabase
          .from('orders')
          .update({ sii_document_id: dte.id, sii_status: 'firmado', folio: dte.folio })
          .eq('id', order.id)
          .eq('store_id', auth.storeId)

        if (linkError) {
          console.error('[API /orders] Orden creada pero sin enlace al DTE:', linkError.message)
        }
      }
    }

    const { error: paymentError } = await auth.supabase
      .from('payments')
      .insert([{
        store_id: auth.storeId,
        order_id: order.id,
        amount: total,
        method: paymentMethod,
        status: isEcommerce ? 'pending' : 'completed',
        paid_at: isEcommerce ? null : new Date().toISOString()
      }])

    if (paymentError) {
      console.error('[API /orders] Error al registrar pago:', paymentError)
    }

    if (items?.length) {
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        store_id: auth.storeId,
        price: source === 'ecommerce'
          ? (realPriceById.get(String(item.productId)) ?? 0)
          : (item.unitPrice ?? 0),
      }))

      const { error: itemsError } = await auth.supabase.from('order_items').insert(orderItems)
      if (itemsError) {
        return NextResponse.json({ error: itemsError.message }, { status: 500 })
      }

      for (const item of items) {
        if (item.productId) {
          if (branchId) {
            const { data: inv } = await auth.supabase
              .from('inventory')
              .select('stock')
              .eq('product_id', item.productId)
              .eq('branch_id', branchId)
              .eq('store_id', auth.storeId)
              .single();
            
            if (inv) {
              const newBranchStock = Math.max(0, (inv.stock || 0) - item.quantity);
              await auth.supabase
                .from('inventory')
                .update({ stock: newBranchStock })
                .eq('product_id', item.productId)
                .eq('branch_id', branchId)
                .eq('store_id', auth.storeId);
            }
          }

          const { data: p } = await auth.supabase.from('products').select('stock').eq('id', item.productId).eq('store_id', auth.storeId).single();
          if (p) {
            const newStock = Math.max(0, (p.stock || 0) - item.quantity);
            await auth.supabase.from('products').update({ stock: newStock }).eq('id', item.productId).eq('store_id', auth.storeId);
          }
        }
      }

      if (customerRut && (finalPointsToEarn > 0 || pointsRedeemed > 0)) {
        const cleanedRut = customerRut.replace(/[^0-9kK]/g, '').toUpperCase();
        
        const { data: customerProfile } = await auth.supabase
          .from('profiles')
          .select('id, loyalty_points')
          .eq('rut', cleanedRut)
          .eq('store_id', auth.storeId)
          .maybeSingle();

        if (customerProfile) {
          const currentPoints = customerProfile.loyalty_points || 0;
          const netPointsChange = (finalPointsToEarn || 0) - (pointsRedeemed || 0);
          const newPoints = Math.max(0, currentPoints + netPointsChange);

          await auth.supabase
            .from('profiles')
            .update({ loyalty_points: newPoints })
            .eq('id', customerProfile.id)
            .eq('store_id', auth.storeId);
        }
      }
    }

    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    console.error('[POST /api/orders] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
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

    const parsed = await parseBody(req, orderPatchSchema)
    if ('error' in parsed) return parsed.error
    const { id, status, payment_status, fulfillment_status } = parsed.data

    const { data, error } = await supabase
      .from('orders')
      .update({
        status,
        payment_status,
        fulfillment_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('store_id', profile.store_id)
      .select(ORDER_SELECT)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
