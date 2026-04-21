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
    items 
  } = body

  if (!userId || !total || !paymentMethod) {
    return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
  }

  // 1. Crear la orden con los nuevos campos de logística
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      user_id: userId,
      total,
      subtotal: subtotal ?? total,
      discount: discount ?? 0,
      shipping_cost: shipping ?? 0,
      service_fee: serviceFee ?? 0,
      shipping_type: shippingType ?? 'standard',
      shipping_address_json: shippingAddress ?? {},
      status: status ?? 'pending',
      fulfillment_status: 'pending',
      payment_method: paymentMethod,
      payment_status: 'pending',
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
  }

  return NextResponse.json(order, { status: 201 })
}
