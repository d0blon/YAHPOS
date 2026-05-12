import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  try {
    const { data: { user } } = await supabase.auth.getUser()
    // Nota: Podríamos permitir ver la orden si es pública o validada por sesión, 
    // pero por seguridad filtramos por store_id o user_id.
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Opcional: Validar que el usuario logueado sea el dueño de la orden o un admin de la tienda
    if (user && data.user_id !== user.id) {
       // Si es admin de la tienda, permitir
       const { data: profile } = await supabase.from('profiles').select('role, store_id').eq('id', user.id).single()
       if (profile?.role !== 'admin' && profile?.role !== 'manager' && data.store_id !== profile?.store_id) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
       }
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
