import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

type Params = Promise<{ id: string }>

export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const { data, error } = await supabase
      .from('terminals')
      .update({ name: body.name, description: body.description, is_active: body.is_active })
      .eq('id', id)
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('terminals')
      .update({ is_active: false })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[DELETE /api/terminals/[id]] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
