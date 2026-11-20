import { NextRequest, NextResponse } from 'next/server'
import { withAuth, apiError } from '@/lib/api-utils'
import { createAdminClient } from '@/lib/supabase'
import { parseFormData } from '@/lib/validations/http'
import { invoiceUploadSchema } from '@/lib/validations/api'

type ExtractedInvoice = {
  invoice_number?: string | null
  supplier_name?: string | null
  supplier_metadata?: Record<string, unknown> | null
  items?: unknown[] | null
}

function errorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' && error !== null && 'message' in error &&
    typeof error.message === 'string' && error.message.length > 0
  ) {
    return error.message
  }
  return fallback
}

export async function POST(req: NextRequest) {
  const auth = await withAuth()
  if ('error' in auth) return auth.error

  const { storeId } = auth

  try {
    const parsedUpload = await parseFormData(req, invoiceUploadSchema)
    if ('error' in parsedUpload) return parsedUpload.error
    const file = parsedUpload.data.file

    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `stores/${storeId}/invoices/${timestamp}-${safeName}`

    const adminSupabase = createAdminClient()

    // 1. Subir el archivo al bucket seguro 'invoice-files'
    const { error: uploadError } = await adminSupabase.storage
      .from('invoice-files')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('[invoice-upload] Storage upload error:', uploadError)
      return apiError('Error al subir el archivo al almacenamiento seguro', 500)
    }

    // 2. Crear una URL firmada con validez de 7 días (para visualización segura en la UI)
    const { data: signedUrlData, error: signedUrlError } = await adminSupabase.storage
      .from('invoice-files')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7)

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('[invoice-upload] Signed URL error:', signedUrlError)
      return apiError('Error al generar el enlace de visualización seguro', 500)
    }

    const signedUrl = signedUrlData.signedUrl

    // 3. Convertir el archivo a base64 para enviarlo a Gemini
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const base64Data = fileBuffer.toString('base64')

    // 4. Llamar a Gemini 1.5 Flash para extraer los datos estructurados
    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      return apiError('El motor de Inteligencia Artificial (Gemini) no está configurado', 500)
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`

    const prompt = `Analiza esta factura o documento de compra.
Extrae los siguientes datos en formato JSON estructurado:
{
  "invoice_number": "número de factura (string o null si no se encuentra)",
  "supplier_name": "nombre del proveedor o distribuidora (string)",
  "supplier_metadata": {
    "phone": "número de teléfono o celular del distribuidor si aparece (string o null)",
    "email": "email de contacto del distribuidor si aparece (string o null)",
    "address": "dirección física del distribuidor si aparece (string o null)"
  },
  "items": [
    {
      "barcode": "código de barras, código EAN o SKU del producto (string)",
      "name": "nombre o descripción del producto (string)",
      "quantity": "cantidad de unidades compradas (número entero)",
      "brand": "marca del producto si aparece (string o null)",
      "volume": "contenido neto / volumen, ej: 900ml, 1kg (string o null)"
    }
  ]
}

Asegúrate de retornar únicamente el objeto JSON válido. No envuelvas la respuesta en bloques de código markdown como \`\`\`json ni añadas texto explicativo.`

    const payload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: file.type,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    }

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('[Gemini API Error]:', errText)
      return apiError('Error al procesar el archivo con el motor de IA', 500)
    }

    const geminiData = await geminiRes.json()
    const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!textResponse) {
      return apiError('La IA no pudo extraer la información del documento', 500)
    }

    let jsonText = textResponse.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/```$/, '').trim()
    }

    let parsedData: ExtractedInvoice
    try {
      const parsedJson: unknown = JSON.parse(jsonText)
      parsedData = parsedJson as ExtractedInvoice
    } catch (parseError) {
      console.error('[Gemini Parser Error]: Failed to parse JSON:', jsonText, parseError)
      return apiError('La IA retornó un formato de datos no compatible', 500)
    }

    // 5. Insertar en la tabla de ingresos pendientes
    const { data: adjustment, error: insertError } = await adminSupabase
      .from('pending_inventory_adjustments')
      .insert([{
        store_id: storeId,
        invoice_number: parsedData.invoice_number || null,
        supplier_name: parsedData.supplier_name || 'Proveedor Desconocido',
        supplier_metadata: parsedData.supplier_metadata || {},
        invoice_url: signedUrl,
        items: parsedData.items || [],
        status: 'pending'
      }])
      .select('id, store_id, invoice_number, supplier_name, supplier_metadata, invoice_url, items, status, created_at, updated_at')
      .single()

    if (insertError) {
      console.error('[invoice-upload] Database insert error:', insertError)
      return apiError('Error al guardar el ingreso pendiente en la base de datos', 500)
    }

    return NextResponse.json({
      success: true,
      adjustment
    }, { status: 201 })

  } catch (error: unknown) {
    console.error('[invoice-upload] Unhandled error:', error)
    return apiError(errorMessage(error, 'Error interno del servidor'), 500)
  }
}
