import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase'

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : undefined
}

type Granularity = 'week' | 'month' | 'year' | 'custom'

const M_SHORT = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
const M_FULL  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

/** La grilla siempre tiene esta cantidad de columnas, sea cual sea la vista — así el ancho de
 *  cada cuadrado nunca cambia al cambiar de período, solo lo que se pinta adentro. */
const FIXED_COLS = 52

/** YYYY-MM-DD en hora de Chile (no UTC) */
const dayKeyCL = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
})

function keyOf(iso: string) {
  return dayKeyCL.format(new Date(iso))
}
function addDays(d: Date, n: number) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
function keyOfDate(d: Date) {
  return dayKeyCL.format(d)
}
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('store_id, role').eq('id', user.id).single()

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
      return NextResponse.json({ error: 'No se pudo determinar la tienda' }, { status: 404 })
    }

    const sp = req.nextUrl.searchParams
    const granularity = (sp.get('granularity') || 'month') as Granularity
    const branchId = sp.get('branchId')

    // --- Definir ventana de fechas y la forma de los buckets ---
    const today = new Date()
    let rangeStart: Date
    let rangeEnd: Date
    let buckets: { label: string; startKey: string; endKey: string; pos: number; ecom: number; empty?: boolean }[] = []
    const ticks: { at: number; text: string; current?: boolean }[] = []

    if (granularity === 'week') {
      // 52 días terminando hoy, un bucket por día
      rangeEnd = today
      rangeStart = addDays(today, -(FIXED_COLS - 1))
      for (let i = 0; i < FIXED_COLS; i++) {
        const d = addDays(rangeStart, i)
        const k = keyOfDate(d)
        buckets.push({ label: `${d.getDate()} ${M_FULL[d.getMonth()]}`, startKey: k, endKey: k, pos: 0, ecom: 0 })
        if (i % 7 === 0) ticks.push({ at: i, text: `${d.getDate()} ${M_SHORT[d.getMonth()]}` })
      }
    } else if (granularity === 'year') {
      // 52 meses terminando en el mes actual (~4 años y 4 meses), un bucket por mes
      const endMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      rangeStart = addMonths(endMonth, -(FIXED_COLS - 1))
      rangeEnd = new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 0)
      for (let i = 0; i < FIXED_COLS; i++) {
        const d = addMonths(rangeStart, i)
        buckets.push({
          label: `${capitalize(M_FULL[d.getMonth()])} ${d.getFullYear()}`,
          startKey: keyOfDate(d),
          endKey: keyOfDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
          pos: 0, ecom: 0,
        })
        if (d.getMonth() === 0) {
          ticks.push({ at: i, text: String(d.getFullYear()), current: d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() })
        } else if (i === 0) {
          ticks.push({ at: i, text: `${M_SHORT[d.getMonth()]} ${d.getFullYear()}`, current: false })
        }
      }
    } else if (granularity === 'custom') {
      const from = sp.get('from'), to = sp.get('to')
      if (!from || !to) {
        return NextResponse.json({ error: 'Faltan los parámetros from y to' }, { status: 400 })
      }
      rangeStart = new Date(from + 'T00:00:00')
      rangeEnd = new Date(to + 'T00:00:00')
      if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime()) || rangeEnd < rangeStart) {
        return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
      }
      const days = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1
      if (days > 1100) {
        return NextResponse.json({ error: 'El rango no puede superar 3 años' }, { status: 400 })
      }

      // Siempre 52 buckets: si el rango tiene 52 días o menos, un bucket por día (el resto se
      // rellena vacío al final). Si tiene más, se reparte el rango en 52 tramos lo más parejos
      // posible (cada uno cubre floor(days/52) o floor(days/52)+1 días, sin huecos ni superposición).
      const realBuckets: typeof buckets = []
      if (days <= FIXED_COLS) {
        for (let i = 0; i < days; i++) {
          const d = addDays(rangeStart, i), k = keyOfDate(d)
          realBuckets.push({ label: `${d.getDate()} ${M_FULL[d.getMonth()]}`, startKey: k, endKey: k, pos: 0, ecom: 0 })
        }
      } else {
        for (let i = 0; i < FIXED_COLS; i++) {
          const dayStart = Math.floor(i * days / FIXED_COLS)
          const dayEnd = Math.floor((i + 1) * days / FIXED_COLS) - 1
          const a = addDays(rangeStart, dayStart)
          const b = addDays(rangeStart, dayEnd)
          realBuckets.push({
            label: dayStart === dayEnd
              ? `${a.getDate()} ${M_FULL[a.getMonth()]}`
              : `${a.getDate()} ${M_SHORT[a.getMonth()]} - ${b.getDate()} ${M_SHORT[b.getMonth()]}`,
            startKey: keyOfDate(a), endKey: keyOfDate(b), pos: 0, ecom: 0,
          })
        }
      }

      const step = Math.max(1, Math.ceil(realBuckets.length / 8))
      realBuckets.forEach((b, i) => {
        if (i % step === 0) {
          const d = new Date(b.startKey + 'T00:00:00')
          ticks.push({ at: i, text: `${d.getDate()} ${M_SHORT[d.getMonth()]}` })
        }
      })

      buckets = realBuckets
      while (buckets.length < FIXED_COLS) {
        buckets.push({ label: '', startKey: '', endKey: '', pos: 0, ecom: 0, empty: true })
      }
    } else {
      // 'month' (default): el año en curso, un bucket por semana (52 buckets)
      const year = today.getFullYear()
      const first = new Date(year, 0, 1)
      const start = addDays(first, -(((first.getDay() + 6) % 7)))
      rangeStart = start
      rangeEnd = addDays(start, FIXED_COLS * 7 - 1)
      const seen = new Set<number>()
      for (let w = 0; w < FIXED_COLS; w++) {
        const a = addDays(start, w * 7)
        const b = addDays(a, 6)
        buckets.push({
          label: `Semana del ${a.getDate()} ${M_SHORT[a.getMonth()]}`,
          startKey: keyOfDate(a), endKey: keyOfDate(b), pos: 0, ecom: 0,
        })
        // Mes "dominante" de la semana = el jueves de esa semana (misma convención que ISO 8601 usa
        // para decidir a qué año pertenece una semana). Evita que la semana de fin/inicio de año quede
        // etiquetada con el mes viejo por 2-3 días, generando un tick pegado al del mes siguiente.
        const dominantMonth = addDays(a, 3).getMonth()
        if (!seen.has(dominantMonth)) {
          seen.add(dominantMonth)
          ticks.push({ at: w, text: M_SHORT[dominantMonth], current: dominantMonth === today.getMonth() })
        }
      }
    }

    // --- Traer SOLO las columnas necesarias, filtradas por la ventana ---
    // (el endpoint viejo hacía select('*') sin filtro de fecha)
    let q = supabase
      .from('orders')
      .select('created_at, total, register_id, address')
      .eq('store_id', storeId)
      // Solo órdenes cobradas. Lista blanca a propósito: cualquier estado nuevo
      // (refunded, cancelled…) queda fuera por defecto en vez de colarse.
      .in('payment_status', ['paid', 'completed'])
      .gte('created_at', new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).toISOString())
      .lte('created_at', new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59).toISOString())

    if (branchId && branchId !== 'all') q = q.eq('branch_id', branchId)

    const { data: orders, error } = await q
    if (error) throw error

    // --- Índice día -> bucket, para asignar en O(n) ---
    const dayToBucket = new Map<string, number>()
    buckets.forEach((b, i) => {
      if (b.empty) return
      let cur = new Date(b.startKey + 'T00:00:00')
      const end = new Date(b.endKey + 'T00:00:00')
      while (cur <= end) {
        dayToBucket.set(keyOfDate(cur), i)
        cur = addDays(cur, 1)
      }
    })

    for (const o of orders || []) {
      const idx = dayToBucket.get(keyOf(o.created_at as string))
      if (idx === undefined) continue
      // Clasificación correcta — NUNCA usar shipping_type (es 'pickup' en 49 de 50 órdenes)
      const isPOS = o.register_id !== null
        || o.address === 'Venta Presencial POS'
        || o.address === 'Venta en mesón (POS)'
      const amount = Number(o.total) || 0
      if (isPOS) buckets[idx].pos += amount
      else buckets[idx].ecom += amount
    }

    const total = buckets.reduce((a, b) => a + b.pos + b.ecom, 0)

    return NextResponse.json({
      granularity,
      buckets: buckets.map(({ label, pos, ecom }) => ({ label, pos, ecom })),
      ticks,
      total,
    })
  } catch (err: unknown) {
    const message = errorMessage(err)
    console.error('[Dashboard Series API Error]:', message)
    return NextResponse.json({ error: message || 'Error interno' }, { status: 500 })
  }
}
