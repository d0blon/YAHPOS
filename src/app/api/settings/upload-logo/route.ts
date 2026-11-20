import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/api-utils'
import { createAdminClient } from '@/lib/supabase'
import { parseFormData } from '@/lib/validations/http'
import { logoUploadSchema } from '@/lib/validations/api'

function hasAllowedImageSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === 'image/png') {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)
  }
  if (mime === 'image/webp') {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    )
  }
  return false
}

export async function POST(req: NextRequest) {
  const auth = await withAuth()
  if ('error' in auth) return auth.error

  const { storeId } = auth

  try {
    const parsed = await parseFormData(req, logoUploadSchema)
    if ('error' in parsed) return parsed.error
    const file = parsed.data.file

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!hasAllowedImageSignature(bytes, file.type)) {
      return apiError('El contenido del archivo no coincide con PNG/WebP', 400)
    }

    const ext = file.type === 'image/png' ? 'png' : 'webp'
    const timestamp = Date.now()
    const safeBase = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'logo'
    const filePath = `${storeId}/${timestamp}-${safeBase}.${ext}`

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
  } catch (error) {
    console.error('[upload-logo] Error:', error)
    return apiError(error instanceof Error ? error.message : 'Error interno del servidor', 500)
  }
}
