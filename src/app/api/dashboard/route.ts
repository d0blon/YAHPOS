import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase'
import { parseQuery } from '@/lib/validations/http'
import { dashboardQuerySchema } from '@/lib/validations/api'

interface PersonnelRow {
  first_name: string | null
  last_name: string | null
  role: string | null
  current_area: string | null
}

interface OrderRow {
  id: string
  payment_status: string
  total: number | null
  created_at: string
  status: string | null
  payment_method: string | null
}

interface OrderItemRow {
  product_id: string | number
  quantity: number
  price: number
}

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : undefined
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  try {
    // 0. Obtener store_id del perfil del usuario
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single()

    // El header x-store-id es falsificable: NUNCA se lee acá. store_id del perfil
    // es la fuente canónica. Solo cuentas plataforma (developer/superadmin) pueden
    // resolver la tienda desde el Host, y siempre en servidor (RPC de dominio).
    const isPlatformRole = ['developer', 'superadmin'].includes((profile?.role ?? '').toLowerCase())
    let storeId = profile?.store_id ?? null

    if (!storeId && isPlatformRole) {
      const host = (req.headers.get('host') || '').toLowerCase()
      const { data: storeFromHost } = host
        ? await supabase.rpc('get_store_by_domain', { p_host: host }).maybeSingle()
        : { data: null }
      storeId = (storeFromHost as { id?: string } | null)?.id ?? null
    }

    if (!storeId) {
      if (!isPlatformRole) {
        return NextResponse.json({ error: 'Perfil sin tienda' }, { status: 403 })
      }
      return NextResponse.json({ error: 'No se pudo determinar la tienda para esta request' }, { status: 404 })
    }

    const parsedQuery = parseQuery(req, dashboardQuerySchema)
    if ('error' in parsedQuery) return parsedQuery.error
    const branchId = parsedQuery.data.branchId

    // 1. Obtener datos de pedidos para ingresos y conteo (Filtrado por store_id y opcionalmente branch_id)
    let ordersQuery = supabase
      .from('orders')
      .select('id, payment_status, total, created_at, status, payment_method', { count: 'exact' })
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(500)

    if (branchId && branchId !== 'all') {
      ordersQuery = ordersQuery.eq('branch_id', branchId)
    }
    const { data: orders, error: ordersError, count: orderCount } = await ordersQuery

    if (ordersError) throw ordersError

    // 2. Obtener conteo de productos (Filtrado por store_id)
    const { count: productCount, error: productError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)

    if (productError) throw productError

    // 3. Obtener conteo de clientes (Filtrado por store_id)
    const { count: customerCount, error: customerError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
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

    const activePersonnel = (activePersonnelData || []).map((p: PersonnelRow) => ({
      name: `${p.first_name} ${p.last_name}`.trim(),
      role: p.role,
      area: p.current_area
    }))

    // 5. Obtener items vendidos para Top Products
    const orderIds = (orders || []).map((o: OrderRow) => o.id)
    let orderItems: OrderItemRow[] = []
    
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

    const PAID_STATUSES = ['paid', 'completed']
    const paidOrders = (orders || []).filter((o: OrderRow) => PAID_STATUSES.includes(o.payment_status))
    const totalRevenue = paidOrders.reduce((acc: number, o: OrderRow) => acc + (Number(o.total) || 0), 0)

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

    // 7. Generar datos para Gráfico de Dona (Métodos de Pago)
    const paymentMethodsData: Record<string, number> = {};
    paidOrders.forEach(o => {
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

    // 8. Obtener lista de sucursales para el selector frontend
    const { data: branches } = await supabase
      .from('branches')
      .select('id, name')
      .eq('store_id', storeId)
      .order('created_at', { ascending: true })

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
      paymentMethods,
      branches: branches || []
    })

  } catch (error: unknown) {
    const message = errorMessage(error)
    console.error('[Dashboard API Error]:', message)
    return NextResponse.json({ error: message || 'Error interno del servidor' }, { status: 500 })
  }
}
