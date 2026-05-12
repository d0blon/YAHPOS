import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
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
  const supabase = await createClient()
  const body = await req.json()
  console.log('[API /orders] Recibido:', body)

  // Validación con Zod
  const validated = orderSchema.safeParse(body)
  if (!validated.success) {
    console.error('[API /orders] Validation Error:', validated.error.issues)
    return NextResponse.json({ 
      error: 'Datos de orden inválidos', 
      details: validated.error.issues 
    }, { status: 400 })
  }

  const { 
    userId, 
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

  // 1. Idempotency: si ya existe orden con este offlineId, retornarla
  if (offlineId) {
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('metadata->>offline_id', offlineId)
      .maybeSingle()
    
    if (existingOrder) {
      console.log('[API /orders] Orden duplicada detectada (offlineId=%s), retornando existente', offlineId)
      return NextResponse.json(existingOrder, { status: 200 })
    }
  }

  // 2. Validar userId del body (Requerido según auditoría de seguridad)
  if (!userId) {
    return NextResponse.json({ error: 'Usuario no identificado (Falta userId)' }, { status: 400 })
  }

  if (!total || !paymentMethod) {
    return NextResponse.json({ error: 'Faltan datos obligatorios (total, paymentMethod)' }, { status: 400 })
  }

  const finalUserId = userId

  // 2. Obtener store_id del perfil del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id')
    .eq('id', finalUserId)
    .single()

  if (!profile?.store_id) {
    return NextResponse.json({ error: 'El usuario no tiene una tienda asociada' }, { status: 403 })
  }

  // 2.1 Obtener configuraciones de lealtad
  const { data: settingsData } = await supabase
    .from('settings')
    .select('key, value')
    .eq('store_id', profile.store_id);
  
  const settings: Record<string, string> = {};
  settingsData?.forEach(s => { settings[s.key] = s.value; });

  const loyaltyEnabled = settings.loyalty_enabled === 'true';
  const accumulationRate = parseInt(settings.loyalty_accumulation_rate || '100');
  
  // Calcular puntos si no vienen pre-calculados
  let finalPointsToEarn = pointsToEarn || 0;
  if (loyaltyEnabled && !pointsToEarn && total > 0) {
    finalPointsToEarn = Math.floor(total / accumulationRate);
  }

  // 3. Crear la orden
  const isEcommerce = source === 'ecommerce'
  
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      user_id: finalUserId,
      store_id: profile.store_id,
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

  // 4. Registrar el pago en la tabla payments (Trazabilidad Financiera)
  const { error: paymentError } = await supabase
    .from('payments')
    .insert([{
      store_id: profile.store_id,
      order_id: order.id,
      amount: total,
      method: paymentMethod,
      status: isEcommerce ? 'pending' : 'completed',
      paid_at: isEcommerce ? null : new Date().toISOString()
    }])

  if (paymentError) {
    console.error('[API /orders] Error al registrar pago:', paymentError)
    // No bloqueamos la orden si falla el log de pago, pero lo reportamos
  }

  // 5. Insertar los items
  if (items?.length) {
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.unitPrice ?? item.product?.price ?? 0,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // 6. Actualizar stock (Reducción)
    for (const item of items) {
      if (item.productId) {
        // Reducción en tabla de Sucursal (si existe branchId)
        if (branchId) {
          const { data: inv } = await supabase
            .from('inventory')
            .select('stock')
            .eq('product_id', item.productId)
            .eq('branch_id', branchId)
            .single();
          
          if (inv) {
            const newBranchStock = Math.max(0, (inv.stock || 0) - item.quantity);
            await supabase
              .from('inventory')
              .update({ stock: newBranchStock })
              .eq('product_id', item.productId)
              .eq('branch_id', branchId);
          }
        }

        // Reducción en tabla maestra (products)
        const { data: p } = await supabase.from('products').select('stock').eq('id', item.productId).single();
        if (p) {
          const newStock = Math.max(0, (p.stock || 0) - item.quantity);
          await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);
        }
      }
    }

    // 7. Actualizar Puntos de Fidelidad
    if (customerRut && (finalPointsToEarn > 0 || pointsRedeemed > 0)) {
      const cleanedRut = customerRut.replace(/[^0-9kK]/g, '').toUpperCase();
      
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('id, loyalty_points')
        .eq('rut', cleanedRut)
        .single();
        
      if (customerProfile) {
        const currentPoints = customerProfile.loyalty_points || 0;
        const netPointsChange = (finalPointsToEarn || 0) - (pointsRedeemed || 0);
        const newPoints = Math.max(0, currentPoints + netPointsChange);
        
        await supabase
          .from('profiles')
          .update({ loyalty_points: newPoints })
          .eq('id', customerProfile.id);
      }
    }
  }

  return NextResponse.json(order, { status: 201 })
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
