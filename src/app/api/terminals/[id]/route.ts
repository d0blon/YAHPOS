import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { parseBody } from '@/lib/validations/http'
import { terminalUpdateSchema } from '@/lib/validations/api'

type Params = Promise<{ id: string }>

export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { id } = await params
    const parsed = await parseBody(req, terminalUpdateSchema)
    if ('error' in parsed) return parsed.error
    const body = parsed.data

    const { data, error } = await auth.supabase
      .from('terminals')
      .update({ name: body.name, description: body.description, is_active: body.is_active })
      .eq('id', id)
      .eq('store_id', auth.storeId)
      .select('id, store_id, name, description, is_active, status, current_user_id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('[PATCH /api/terminals/[id]] Error:', error)
    return NextResponse.json({ error: (error as { message?: string } | null)?.message || 'Error interno del servidor' }, { status: 500 })
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
  } catch (error) {
    console.error('[DELETE /api/terminals/[id]] Error:', error)
    return NextResponse.json({ error: (error as { message?: string } | null)?.message || 'Error interno del servidor' }, { status: 500 })
  }
}
