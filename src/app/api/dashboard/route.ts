import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase'
import { DEVELOPER_EMAILS } from '@/lib/constants'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  try {
    // 0. Obtener store_id del perfil del usuario
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single()

    let storeId = profile?.store_id
    const isDev = user.email && DEVELOPER_EMAILS.includes(user.email.toLowerCase())

    if (!storeId && isDev) {
      // Fallback para desarrolladores: usar la primera tienda encontrada
      const { data: firstStore } = await supabase.from('stores').select('id').limit(1).single()
      storeId = firstStore?.id
      console.log(`[Dashboard API] Developer bypass for ${user.email} using Store: ${storeId}`)
    }

    if (!storeId) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })

    // 1. Obtener datos de pedidos para ingresos y conteo (Filtrado por store_id)
    const { data: orders, error: ordersError, count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('store_id', storeId)

    if (ordersError) throw ordersError

    // 2. Obtener conteo de productos (Filtrado por store_id)
    const { count: productCount, error: productError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)

    if (productError) throw productError

    // 3. Obtener conteo de clientes (Filtrado por store_id)
    const { count: customerCount, error: customerError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('role', 'customer')

    if (customerError && !customerError.message.includes('relation "profiles" does not exist')) {
      throw customerError
    }

    // 4. Obtener Personal Activo (en cajas/terminales)
    const { data: activePersonnelData, error: personnelError } = await supabase
      .from('profiles')
      .select('first_name, last_name, role, current_area')
      .eq('store_id', storeId)
      .neq('current_area', 'Inactivo')

    if (personnelError && !personnelError.message.includes('relation "profiles" does not exist')) {
      console.warn('[Dashboard API] Error al obtener personal activo:', personnelError.message)
    }

    const activePersonnel = (activePersonnelData || []).map((p: any) => ({
      name: `${p.first_name} ${p.last_name}`.trim(),
      role: p.role,
      area: p.current_area
    }))

    // 5. Obtener items vendidos para Top Products
    const orderIds = (orders || []).map((o: any) => o.id)
    let orderItems: any[] = []
    
    if (orderIds.length > 0) {
      const { data, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, price')
        .in('order_id', orderIds)
        .limit(500)

      if (itemsError) throw itemsError
      orderItems = data || []
    }

    // --- CÁLCULOS ---

    const totalRevenue = (orders || []).reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0)

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

    // 6. Generar datos históricos para gráficos (últimos 7 días)
    const salesByDay: Record<string, {pos: number, ecom: number}> = {};
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last7Days.forEach(day => salesByDay[day] = {pos: 0, ecom: 0});
    
    (orders || []).forEach(o => {
      const day = new Date(o.created_at).toISOString().split('T')[0];
      if (salesByDay[day] !== undefined) {
        // Asumimos que si tiene register_id o es pickup, es venta presencial
        if (o.register_id || o.address === 'Venta Presencial POS' || o.shipping_type === 'pickup') {
          salesByDay[day].pos += Number(o.total) || 0;
        } else {
          salesByDay[day].ecom += Number(o.total) || 0;
        }
      }
    });

    const chartData = last7Days.map(day => ({
      name: day.split('-').slice(1).reverse().join('/'),
      POS: salesByDay[day].pos,
      Ecommerce: salesByDay[day].ecom,
      total: salesByDay[day].pos + salesByDay[day].ecom
    }));

    // 7. Generar datos para Gráfico de Dona (Métodos de Pago)
    const paymentMethodsData: Record<string, number> = {};
    (orders || []).forEach(o => {
      const method = (o.payment_method || 'OTRO').toUpperCase();
      if (!paymentMethodsData[method]) {
        paymentMethodsData[method] = 0;
      }
      paymentMethodsData[method] += Number(o.total) || 0;
    });

    const paymentMethods = Object.keys(paymentMethodsData).map(key => ({
      name: key,
      value: paymentMethodsData[key]
    })).sort((a, b) => b.value - a.value);

    return NextResponse.json({
      stats: [
        { title: 'Ventas Totales', value: `$${totalRevenue.toLocaleString('es-CL')}`, change: '+0%', trend: 'up', icon: 'DollarSign' },
        { title: 'Pedidos', value: String(orderCount || 0), change: '+0%', trend: 'up', icon: 'ShoppingCart' },
        { title: 'Productos', value: String(productCount || 0), change: '+0%', trend: 'up', icon: 'Package' },
        { title: 'Clientes', value: String(customerCount || 0), change: '+0%', trend: 'up', icon: 'Users' },
      ],
      recentOrders,
      topProducts,
      activePersonnel,
      chartData,
      paymentMethods
    })

  } catch (error: any) {
    console.error('[Dashboard API Error]:', error.message)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
