import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'

type Params = Promise<{ id: string }>

export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { id } = await params
    const body = await req.json()

    const { data, error } = await auth.supabase
      .from('terminals')
      .update({ name: body.name, description: body.description, is_active: body.is_active })
      .eq('id', id)
      .eq('store_id', auth.storeId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[PATCH /api/terminals/[id]] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Params }) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { id } = await params

    const { error } = await auth.supabase
      .from('terminals')
      .update({ is_active: false })
      .eq('id', id)
      .eq('store_id', auth.storeId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/terminals/[id]] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
