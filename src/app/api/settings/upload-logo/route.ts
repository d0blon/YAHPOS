import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/api-utils'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const auth = await withAuth()
  if ('error' in auth) return auth.error

  const { storeId } = auth

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return apiError('No se recibió ningún archivo', 400)

    const allowedTypes = ['image/svg+xml', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return apiError('Solo se permiten archivos SVG, PNG o WebP', 400)
    }

    if (file.size > 2 * 1024 * 1024) {
      return apiError('El archivo no puede superar los 2MB', 400)
    }

    const ext = file.name.split('.').pop() || 'svg'
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${storeId}/${timestamp}-${safeName}`

    const supabase = createAdminClient()

    const { error: uploadError } = await supabase.storage
      .from('store-logos')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('[upload-logo] Storage error:', uploadError)
      return apiError('Error al subir el archivo al storage', 500)
    }

    const { data: publicUrlData } = supabase.storage
      .from('store-logos')
      .getPublicUrl(filePath)

    return NextResponse.json({ url: publicUrlData.publicUrl })
  } catch (error: any) {
    console.error('[upload-logo] Error:', error)
    return apiError(error.message || 'Error interno del servidor', 500)
  }
}
