import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { withAuth, apiError } from '@/lib/api-utils'
import { orderSchema } from '@/lib/validations/orders'

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
      .select('*')
      .eq('store_id', profile.store_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const body = await req.json()
    console.log('[API /orders] Recibido:', body)

    const validated = orderSchema.safeParse(body)
    if (!validated.success) {
      console.error('[API /orders] Validation Error:', validated.error.issues)
      return NextResponse.json({ 
        error: 'Datos de orden inválidos', 
        details: validated.error.issues 
      }, { status: 400 })
    }

    const { 
      total, 
      subtotal,
      discount, 
      shipping, 
      serviceFee, 
      shippingType,
      shippingAddress,
      paymentMethod, 
      status,
      customerRut,
      pointsToEarn = 0,
      pointsRedeemed = 0,
      items,
      branchId,
      source = 'pos',
      registerId,
      offlineId
    } = validated.data

    if (!total || !paymentMethod) {
      return NextResponse.json({ error: 'Faltan datos obligatorios (total, paymentMethod)' }, { status: 400 })
    }

    if (offlineId) {
      const { data: existingOrder } = await auth.supabase
        .from('orders')
        .select('*')
        .eq('metadata->>offline_id', offlineId)
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
    
    let finalPointsToEarn = pointsToEarn || 0;
    if (loyaltyEnabled && !pointsToEarn && total > 0) {
      finalPointsToEarn = Math.floor(total / accumulationRate);
    }

    const isEcommerce = source === 'ecommerce'
    
    const { data: order, error: orderError } = await auth.supabase
      .from('orders')
      .insert([{
        user_id: auth.user.id,
        store_id: auth.storeId,
        total: total,
        discount: discount ?? 0,
        status: status ?? (isEcommerce ? 'pending' : 'completed'),
        address: isEcommerce 
          ? (typeof shippingAddress === 'object' ? (shippingAddress as any)?.street : shippingAddress) || 'Envío Online'
          : 'Venta Presencial POS',
        payment_method: paymentMethod,
        payment_status: isEcommerce ? 'pending' : 'paid',
        register_id: registerId ? parseInt(registerId) : null,
        shipping_type: shippingType || (isEcommerce ? 'delivery' : 'pickup'),
        shipping_cost: shipping || 0,
        shipping_address_json: shippingAddress || {},
        fulfillment_status: isEcommerce ? 'pending' : 'delivered',
        service_fee: serviceFee || 0,
        metadata: {
          offline_id: offlineId || null,
          loyalty: {
            points_earned: finalPointsToEarn,
            points_redeemed: pointsRedeemed || 0,
            accumulation_rate: accumulationRate
          }
        }
      }])
      .select()
      .single()

    if (orderError) {
      console.error('[API /orders] Error al crear orden:', orderError)
      return NextResponse.json({ error: orderError.message }, { status: 500 })
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
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.unitPrice ?? item.product?.price ?? 0,
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
              .single();
            
            if (inv) {
              const newBranchStock = Math.max(0, (inv.stock || 0) - item.quantity);
              await auth.supabase
                .from('inventory')
                .update({ stock: newBranchStock })
                .eq('product_id', item.productId)
                .eq('branch_id', branchId);
            }
          }

          const { data: p } = await auth.supabase.from('products').select('stock').eq('id', item.productId).single();
          if (p) {
            const newStock = Math.max(0, (p.stock || 0) - item.quantity);
            await auth.supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
          }
        }
      }

      if (customerRut && (finalPointsToEarn > 0 || pointsRedeemed > 0)) {
        const cleanedRut = customerRut.replace(/[^0-9kK]/g, '').toUpperCase();
        
        const { data: customerProfile } = await auth.supabase
          .from('profiles')
          .select('id, loyalty_points')
          .eq('rut', cleanedRut)
          .single();
          
        if (customerProfile) {
          const currentPoints = customerProfile.loyalty_points || 0;
          const netPointsChange = (finalPointsToEarn || 0) - (pointsRedeemed || 0);
          const newPoints = Math.max(0, currentPoints + netPointsChange);
          
          await auth.supabase
            .from('profiles')
            .update({ loyalty_points: newPoints })
            .eq('id', customerProfile.id);
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
  const body = await req.json()
  const { id, status, payment_status, fulfillment_status } = body

  if (!id) return NextResponse.json({ error: 'Falta ID de orden' }, { status: 400 })

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
      .update({
        status,
        payment_status,
        fulfillment_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('store_id', profile.store_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
