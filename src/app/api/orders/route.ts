import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

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
    items,
    branchId
  } = body

  if (!userId || !total || !paymentMethod) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
  }

  // 0. Obtener store_id del perfil del usuario que crea la orden
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id')
    .eq('id', userId || user?.id)
    .single()

  // 1. Crear la orden con el esquema verificado
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      user_id: userId && userId.length > 5 ? userId : (user?.id || '2aa7de68-3107-4a54-8bc9-83f8fdf317ff'),
      store_id: profile?.store_id,
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
    for (const item of items) {
      const productId = isNaN(Number(item.productId)) ? 0 : Number(item.productId);
      if (productId > 0) {
        // Reducción en tabla de Sucursal (si existe branchId)
        if (branchId) {
          const { data: inv } = await supabase
            .from('inventory')
            .select('stock')
            .eq('product_id', productId)
            .eq('branch_id', branchId)
            .single();
          
          if (inv) {
            const newBranchStock = Math.max(0, (inv.stock || 0) - item.quantity);
            await supabase
              .from('inventory')
              .update({ stock: newBranchStock })
              .eq('product_id', productId)
              .eq('branch_id', branchId);
          }
        }

        // Reducción en tabla maestra (products)
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
