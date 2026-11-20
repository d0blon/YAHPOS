import { NextResponse } from 'next/server'
import { z } from 'zod'

type ValidationError = { error: NextResponse }
type Parsed<T> = { data: T } | ValidationError

function invalidPayload(result: { issues: z.ZodIssue[] }): NextResponse {
  return NextResponse.json(
    {
      error: 'Datos inválidos',
      details: result.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    },
    { status: 400 }
  )
}

/** Parsea y valida el body JSON de una API route. Nunca lanza TypeError al cliente. */
export async function parseBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S
): Promise<Parsed<z.infer<S>>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { error: NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }
  }

  const result = schema.safeParse(raw)
  if (!result.success) return { error: invalidPayload(result.error) }
  return { data: result.data }
}

/** Parsea FormData a objeto plano y valida con un esquema zod. */
export async function parseFormData<S extends z.ZodTypeAny>(
  request: Request,
  schema: S
): Promise<Parsed<z.infer<S>>> {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return { error: NextResponse.json({ error: 'FormData inválido' }, { status: 400 }) }
  }

  const raw: Record<string, FormDataEntryValue> = {}
  form.forEach((value, key) => {
    raw[key] = value
  })

  const result = schema.safeParse(raw)
  if (!result.success) return { error: invalidPayload(result.error) }
  return { data: result.data }
}

/**
 * Parsea y valida query params. Convierte strings vacíos en undefined para que los
 * esquemas con `.optional()` funcionen como se espera.
 */
export function parseQuery<S extends z.ZodTypeAny>(
  request: Request,
  schema: S
): Parsed<z.infer<S>> {
  const { searchParams } = new URL(request.url)
  const raw: Record<string, string | undefined> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value === '' ? undefined : value
  })

  const result = schema.safeParse(raw)
  if (!result.success) return { error: invalidPayload(result.error) }
  return { data: result.data }
}

/** Valida los parámetros dinámicos de una ruta (`params` en App Router). */
export function parseParams<S extends z.ZodTypeAny>(
  params: unknown,
  schema: S
): Parsed<z.infer<S>> {
  const result = schema.safeParse(params)
  if (!result.success) return { error: invalidPayload(result.error) }
  return { data: result.data }
}
