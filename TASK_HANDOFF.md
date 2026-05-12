---
status: pending
goal: "Agregar try/catch y validación auth a rutas API críticas (~14 handlers) para evitar crashes silenciosos y acceso no autorizado"
branch: null
created: 2026-05-12T18:00:00-04:00
updated: 2026-05-12T18:00:00-04:00
requires-plan: false
depends-on: []
---

# Handoff: API try/catch + Auth

## Contexto
El análisis de las 44 rutas API reveló:
- **4 handlers** sin try/catch: cualquier error no manejado crashea la ruta
- **9 handlers** sin verificación de sesión: cualquier llamada anónima puede operar
- **3 handlers** sin filtro `store_id`: usuarios autenticados de una tienda pueden modificar datos de otra

Priorizamos las rutas de alto riesgo. Quedan excluidas rutas intencionalmente públicas (ping, health, verify-dns, webpay callbacks, products GET lookup).

Item Kanban: `📋 BACKLOG` > `[Stab] API try/catch (14 rutas)` y `[Stab] Auth Checks en rutas`

## Estrategia
**Un helper compartido** `src/lib/api-utils.ts` con:
- `withAuth(handler)` — wrapper que verifica sesión, extrae `user`, `profile`, `store_id`. Retorna 401 si no auth.
- `requireStoreAccess(storeId, profile)` — helper para verificar que el perfil pertenece a la tienda.
- `apiError(message, status)` — error estándar.

Cada ruta se refactoriza para usar estos helpers. Esto evita repetir el mismo patrón en 14 archivos.

## Archivos a modificar (en orden)

### Helper nuevo
0. `src/lib/api-utils.ts` — Crear con `withAuth`, `requireStoreAccess`, `apiError`

### Grupo A: Agregar try/catch (4 handlers)
1. `src/app/api/orders/route.ts` — POST handler envolver en try/catch
2. `src/app/api/products/lookup/route.ts` — GET handler envolver en try/catch (outer)
3. `src/app/api/auth/sso/route.ts` — GET handler envolver en try/catch
4. `src/app/api/terminals/route.ts` — POST handler envolver en try/catch

### Grupo B: Agregar auth + store_id (alta prioridad — fuga de datos)
5. `src/app/api/customers/route.ts` — GET/POST/DELETE: agregar `withAuth` y filtro store_id
6. `src/app/api/customers/list/route.ts` — GET: agregar `withAuth` y filtro store_id
7. `src/app/api/customers/verify/route.ts` — POST: agregar `withAuth` y filtro store_id
8. `src/app/api/staff/route.ts` — GET/POST/PATCH/DELETE: agregar `withAuth` y filtro store_id
9. `src/app/api/cash-movements/route.ts` — GET/POST: agregar `withAuth` y filtro store_id
10. `src/app/api/orders/route.ts` — POST: reemplazar `userId` del body por sesión autenticada
11. `src/app/api/orders/[id]/confirm-payment/route.ts` — POST: agregar `withAuth` y store_id
12. `src/app/api/categories/route.ts` — GET: agregar filtro store_id (al menos)
13. `src/app/api/sii/sync/route.ts` — POST: agregar `withAuth` y validar store_id

### Grupo C: Agregar store_id a rutas existentes con auth (alcance multi-tienda)
14. `src/app/api/products/[id]/route.ts` — GET/PATCH/DELETE: filtrar por store_id
15. `src/app/api/terminals/[id]/route.ts` — PATCH/DELETE: filtrar por store_id
16. `src/app/api/pos/draft/route.ts` — GET/POST: filtrar por store_id

## Especificación Técnica

### Helper: `src/lib/api-utils.ts`

```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function withAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { error: apiError('No autorizado', 401) }

  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.store_id) return { error: apiError('Perfil sin tienda', 403) }

  return { user, profile, supabase, storeId: profile.store_id }
}

export function requireStoreAccess(profile: { store_id: string | null }, targetStoreId: string) {
  return profile.store_id === targetStoreId
}
```

Los 3 helpers cubren el 90% de los casos de uso. Para rutas especiales (sincronización entre stores, etc.), se puede usar `apiError` directamente.

### Grupo A: try/catch — patrón estándar

Cada handler se envuelve así:

```ts
export async function POST(request: Request) {
  try {
    // ... existing logic ...
  } catch (error) {
    console.error('[POST /api/...]', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
```

### Grupo B: auth — patrón estándar con withAuth

```ts
import { withAuth, apiError } from '@/lib/api-utils'

export async function GET(request: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error

  const { supabase, storeId } = auth
  // ... usar storeId para filtrar queries ...
}
```

#### Detalle para `customers/route.ts`
- GET: filtrar `profiles` por `store_id` del auth
- POST: asociar nuevo customer al `store_id` del auth
- DELETE: verificar que el customer pertenece al store

#### Detalle para `orders/route.ts` POST
- Reemplazar `userId` del body por `auth.user.id`
- Filtrar creación de orden por `store_id` del auth

#### Detalle para `orders/[id]/confirm-payment/route.ts` POST
- Verificar que la orden pertenece al `store_id` del auth
- No permitir confirmar pagos de otras tiendas

#### Detalle para `staff/route.ts`
- Filtrar CRUD por `store_id` del auth
- Solo admin/manager puede gestionar staff

#### Detalle para `cash-movements/route.ts`
- Filtrar por `store_id` del auth
- Asociar movimientos al store del auth

#### Detalle para `sii/sync/route.ts`
- Reemplazar validación débil (`storeId` del body) por auth real
- Verificar que el store_id del auth coincide

### Grupo C: store_id — filtrar queries existentes

```ts
// ANTES en products/[id]/route.ts
const { data: product } = await supabase
  .from('products')
  .select('*')
  .eq('id', params.id)
  .single()

// DESPUÉS
const { data: product } = await supabase
  .from('products')
  .select('*')
  .eq('id', params.id)
  .eq('store_id', storeId)  // <-- agregar filtro
  .single()
```

Mismo patrón para `terminals/[id]` y `pos/draft`.

## Do Not
- ❌ NO cambiar lógica de negocio existente — solo agregar try/catch y auth
- ❌ NO modificar rutas intencionalmente públicas: ping, health, verify-dns, webpay
- ❌ NO refactorizar el contenido de los handlers — solo envolver y agregar validaciones
- ❌ NO tocar el motor SII, PaymentModal, ni archivos fuera de la lista
- ❌ NO modificar la estructura de respuesta exitosa (solo manejo de errores cambia)

## Criterios de Aprobación
- [ ] `src/lib/api-utils.ts` creado con `withAuth`, `requireStoreAccess`, `apiError`
- [ ] Grupo A: 4 handlers con try/catch — error interno retorna 500 sin crash
- [ ] Grupo B: 9 handlers con auth — llamada anónima retorna 401; datos filtrados por store
- [ ] Grupo C: 3 handlers con filtro store_id — usuario no puede ver/modificar datos de otra tienda
- [ ] `npm run lint` pasa
- [ ] `npm run build` pasa
- [ ] Rutas públicas (ping, health, etc.) siguen sin auth

## Next Action
1. Crear `src/lib/api-utils.ts`
2. Grupo A: try/catch en 4 handlers
3. Grupo B: auth en 9 handlers (customer, staff, cash-movements, orders, categories, sii/sync)
4. Grupo C: store_id en 3 handlers (products/[id], terminals/[id], pos/draft)
5. Commit por grupo (3 commits chicos)
6. `npm run lint` y `npm run build` después de cada commit
7. Reportar resultados
