import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()

  try {
    // 1. Obtener datos de pedidos para ingresos y conteo
    const { data: orders, error: ordersError, count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })

    if (ordersError) throw ordersError

    // 2. Obtener conteo de productos
    const { count: productCount, error: productError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })

    if (productError) throw productError

    // 3. Obtener conteo de clientes (basado en perfiles con rol customer)
    const { count: customerCount, error: customerError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer')

    if (customerError && !customerError.message.includes('relation "profiles" does not exist')) {
      throw customerError
    }

    // 4. Obtener items vendidos para Top Products
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity, price')
      .limit(500)

    if (itemsError) throw itemsError

    // --- CÁLCULOS ---

    const totalRevenue = (orders || []).reduce((acc, o) => acc + (Number(o.total) || 0), 0)

    // Formatear Pedidos Recientes (últimos 5)
    const recentOrders = [...(orders || [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(o => ({
        id: `ORD-${String(o.id).padStart(3, '0')}`,
        customer: 'Cliente Registrado',
        total: o.total,
        status: o.status,
        date: new Date(o.created_at).toISOString().split('T')[0]
      }))

    // Calcular Top Products
    const productStats: Record<string, { name: string, sales: number, revenue: number }> = {};
    
    (orderItems || []).forEach(item => {
      const pId = String(item.product_id)
      if (!productStats[pId]) {
        productStats[pId] = { name: `Producto #${pId}`, sales: 0, revenue: 0 }
      }
      productStats[pId].sales += item.quantity || 0
      productStats[pId].revenue += (item.quantity * item.price) || 0
    })

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)

    return NextResponse.json({
      stats: [
        { title: 'Ventas Totales', value: `$${totalRevenue.toLocaleString('es-CL')}`, change: '+0%', trend: 'up', icon: 'DollarSign' },
        { title: 'Pedidos', value: String(orderCount || 0), change: '+0%', trend: 'up', icon: 'ShoppingCart' },
        { title: 'Productos', value: String(productCount || 0), change: '+0%', trend: 'up', icon: 'Package' },
        { title: 'Clientes', value: String(customerCount || 0), change: '+0%', trend: 'up', icon: 'Users' },
      ],
      recentOrders,
      topProducts
    })

  } catch (error: any) {
    console.error('[Dashboard API Error]:', error.message)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
