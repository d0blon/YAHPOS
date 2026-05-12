import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Obtenemos el store_id del perfil para filtrado explícito (Defense in Depth)
    // Aunque RLS ya restringe el acceso en la base de datos.

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.store_id) return NextResponse.json({ error: 'Sin tienda' }, { status: 403 })
    if (profile.role === 'customer' || profile.role === 'cashier') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, total, created_at, status, order_items(product_id, quantity, price, products(name, category))')
      .eq('store_id', profile.store_id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (ordersError) throw ordersError

    const salesByDay: Record<string, number> = {}
    const salesByCategory: Record<string, number> = {}
    const topProducts: Record<number, { name: string, quantity: number, total: number }> = {}
    
    let totalSales = 0
    let totalOrders = orders?.length || 0

    orders?.forEach(order => {
      totalSales += order.total
      
      const day = new Date(order.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })
      salesByDay[day] = (salesByDay[day] || 0) + order.total

      order.order_items?.forEach((item: any) => {
        const category = item.products?.category || 'Sin Categoría'
        salesByCategory[category] = (salesByCategory[category] || 0) + (item.price * item.quantity)

        const productId = item.product_id
        if (!topProducts[productId]) {
          topProducts[productId] = { name: item.products?.name || 'Producto Desconocido', quantity: 0, total: 0 }
        }
        topProducts[productId].quantity += item.quantity
        topProducts[productId].total += (item.price * item.quantity)
      })
    })

    const chartData = Object.entries(salesByDay).map(([name, sales]) => ({ name, sales }))
    const categoryData = Object.entries(salesByCategory).map(([name, value]) => ({ name, value }))
    const bestProducts = Object.values(topProducts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    return NextResponse.json({
      summary: {
        totalSales,
        totalOrders,
        avgTicket: totalOrders > 0 ? totalSales / totalOrders : 0
      },
      chartData,
      categoryData,
      bestProducts
    })

  } catch (err: any) {
    console.error('[API /reports] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
