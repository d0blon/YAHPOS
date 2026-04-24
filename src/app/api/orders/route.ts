import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = createServerClient()
  const body = await req.json()
  console.log('[API /orders] Recibido:', body)

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
    pointsToEarn,
    pointsRedeemed,
    items 
  } = body

  if (!userId || !total || !paymentMethod) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
  }

  // 1. Crear la orden con el esquema verificado
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      user_id: userId && userId.length > 5 ? userId : '2aa7de68-3107-4a54-8bc9-83f8fdf317ff',
      total: total,
      discount: discount ?? 0,
      status: status ?? 'completed',
      address: 'Venta Presencial POS',
      payment_method: paymentMethod || 'EFECTIVO',
      payment_status: 'paid',
      register_id: body.registerId || 1,
      shipping_type: 'pickup',
      shipping_cost: 0,
      shipping_address_json: {},
      fulfillment_status: 'delivered',
      service_fee: 0
    }])
    .select()
    .single()

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 })
  }

  // 2. Insertar los items
  if (items?.length) {
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      product_id: isNaN(Number(item.productId)) ? 0 : Number(item.productId),
      quantity: item.quantity,
      price: item.unitPrice ?? item.product?.price ?? 0,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // 3. Actualizar stock (Reducción)
    // Nota: En una app de producción esto debería ser una RPC o transacción atómica
    for (const item of items) {
      const productId = isNaN(Number(item.productId)) ? 0 : Number(item.productId);
      if (productId > 0) {
        const { data: p } = await supabase.from('products').select('stock').eq('id', productId).single();
        if (p) {
          const newStock = Math.max(0, (p.stock || 0) - item.quantity);
          await supabase.from('products').update({ stock: newStock }).eq('id', productId);
        }
      }
    }

    // 4. Actualizar Puntos de Fidelidad
    if (customerRut && (pointsToEarn > 0 || pointsRedeemed > 0)) {
      const cleanedRut = customerRut.replace(/[^0-9kK]/g, '').toUpperCase();
      
      // Buscar el perfil del cliente
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, loyalty_points')
        .eq('rut', cleanedRut)
        .single();
        
      if (profile) {
        const currentPoints = profile.loyalty_points || 0;
        const netPointsChange = (pointsToEarn || 0) - (pointsRedeemed || 0);
        const newPoints = Math.max(0, currentPoints + netPointsChange);
        
        await supabase
          .from('profiles')
          .update({ loyalty_points: newPoints })
          .eq('id', profile.id);
          
        console.log(`[API /orders] Puntos actualizados para ${cleanedRut}: ${currentPoints} -> ${newPoints} (Ganados: ${pointsToEarn}, Canjeados: ${pointsRedeemed})`);
      }
    }
  }

  return NextResponse.json(order, { status: 201 })
}
