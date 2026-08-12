---
status: closed
goal: "CRÍTICO — cierre de agujeros de seguridad reales en RLS: cualquier usuario puede auto-asignarse dueño de cualquier tienda, editar/borrar cualquier tienda, y más"
branch: "main"
created: 2026-08-12
updated: 2026-08-12
requires-plan: true
zona-roja: true
---

## ✅ CERRADO — verificado por el Arquitecto (2026-08-12)

`npx tsc --noEmit -p .` corrido de forma independiente: cero errores. Los 5 archivos de app
leídos completos, matchean el spec exacto. La migración SQL falló en el primer intento
(`auth.get_merchant_id() does not exist` — igual que pasó antes con `auth.get_store_id()`,
migración 003 nunca se aplicó realmente a esta DB). Corregida: se creó `public.get_merchant_id()`
en vez de depender de la versión rota en `auth`, misma migración corrida con éxito.

**Verificado con pruebas reales (no solo confiar en el reporte):**
- Exploit original (auto-escalarse a owner de tienda ajena vía PATCH directo a `profiles`):
  ahora da `400`, bloqueado por el trigger, con el mensaje de seguridad esperado.
- Usuario ajeno intentando `PATCH`/`DELETE` sobre una tienda real ("Austral Market"): ambos
  bloqueados (0 filas afectadas), la tienda queda intacta.
- Merchant real creando y editando SU PROPIA tienda: sigue funcionando perfecto (201 al crear,
  200 al editar) — el caso legítimo no se rompió.

**Nota:** el archivo `supabase/migrations/026_security_fix_rls_holes.sql` en el repo quedó con
la versión v1 (que referencia `auth.get_merchant_id()`, rota) — hay que pedirle a Antigravity
que lo actualice con el SQL v2 (el que realmente se corrió, con `public.get_merchant_id()`) para
que el historial de migraciones en el repo no quede desincronizado de lo que hay en la DB real.

## ⚠️ Cambio de seguridad crítico — leer completo antes de tocar nada

Auditoría completa de RLS pedida por el usuario tras encontrar (y confirmar con prueba real)
que cualquier cuenta puede auto-asignarse dueño de cualquier tienda. Se revisaron TODAS las
policies de TODAS las tablas (`pg_policies`) y el estado de RLS por tabla (`pg_tables`). Esto
NO es un solo fix — son ~9 tablas con policies demasiado permisivas, más ~5 archivos de la app
que necesitan pasar de cliente RLS-normal a cliente admin para no romperse cuando se cierren
los agujeros. Todo el detalle abajo, con el porqué de cada cambio.

## Contexto — hallazgos confirmados

**1. `profiles` (el más grave, ya explotado en prueba real):** las policies `perfil_propio` y
`self_access` (duplicadas, `USING (auth.uid() = id)`, sin `WITH CHECK`) dejan a cualquier
usuario editar CUALQUIER columna de su propia fila sin restricción — incluidas `role` y
`store_id`. Prueba real: se creó una cuenta cliente normal, se le hizo un solo `PATCH` a su
propio perfil pidiendo `role: 'owner', store_id: <tienda real ajena>`, y funcionó. Quedó con
acceso total a esa tienda.

**2. `stores`:** policy `"Allow all for authenticated"` (`qual: true`, sin restricción) — CUALQUIER
usuario logueado puede editar o BORRAR cualquier tienda del sistema directo por API.

**3. `merchants`:** policy `"Users can manage their own merchant profile"` dice "own" pero la
condición real es `qual: true` — no coincide con la migración 004 original (`user_id =
auth.uid()`), alguien la cambió a mano en algún momento. Cualquiera puede tocar el merchant de
cualquiera.

**4. `admin_finances`, `cash_movements`, `store_settings`, `supplier_product_mappings`:** todas
tienen al menos una policy `qual: true` sin ninguna restricción — acceso total sin relación con
tienda ni rol.

**5. Verificado que NO es un problema:** `user_metadata.role` del JWT sí se puede auto-setear
desde el cliente (confirmado con prueba), pero las policies `admin_total`/`manager_profile_access`
en `profiles` comparan contra `auth.jwt()->>'role'` — el claim ESTÁNDAR de Postgres/Supabase
(siempre `"authenticated"` para cualquier usuario logueado, nunca `"admin"`), NO
`user_metadata.role`. Estas dos policies están muertas/nunca se cumplen — no son una vía de
ataque real, no hace falta tocarlas.

**6. Verificado que NO es un problema:** las tablas `branches`, `cash_sessions`, `categories`,
`inventory`, `order_items`, `orders`, `products`, `settings`, `terminals` tienen una policy
duplicada legacy `store_isolation` que usa una función `get_current_store_id()` en vez de
`get_store_id()` — se verificó su definición y es idéntica en seguridad a `public.get_store_id()`
(mismo lookup en vivo contra `profiles.store_id`, `SECURITY DEFINER`). Es redundante, no
peligrosa. No se toca (fuera de scope, es limpieza cosmética, no seguridad).

## Fix — Parte 1: Migración SQL

Crear `supabase/migrations/026_security_fix_rls_holes.sql`:

```sql
-- 026_security_fix_rls_holes.sql
-- Cierra agujeros reales de RLS encontrados en auditoría completa (2026-08-12).
-- Ver TASK_HANDOFF.md para el detalle de cada hallazgo.

BEGIN;

-- ============================================================
-- 1. profiles: bloquear auto-escalada de role/store_id
-- ============================================================
-- Las policies de "propio perfil" (perfil_propio, self_access) permiten editar
-- CUALQUIER columna sin restricción, incluidas role y store_id -- confirmado explotable
-- con prueba real. Un trigger BEFORE UPDATE bloquea esas dos columnas específicas para
-- cualquier rol que no sea service_role, sin afectar la edición legítima de
-- nombre/telefono/rut/etc por el propio usuario.
CREATE OR REPLACE FUNCTION public.protect_profile_role_and_store_id()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') <> 'service_role' THEN
    IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.store_id IS DISTINCT FROM NEW.store_id) THEN
      RAISE EXCEPTION 'Seguridad: no se permite modificar role/store_id directamente. Use una acción de servidor autorizada.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_profile_role_store_id ON public.profiles;
CREATE TRIGGER tr_protect_profile_role_store_id
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role_and_store_id();

-- ============================================================
-- 2. stores: sacar el "cualquiera puede editar/borrar cualquier tienda"
-- ============================================================
-- auth.get_merchant_id() (migración 003) NUNCA se aplicó de verdad a esta DB (mismo
-- permission wall del schema auth que ya vimos con get_store_id) -- se verificó con
-- pg_proc que no existe en ningún schema. La tabla merchants sí existe. Creamos el
-- equivalente en public, mismo patrón que public.get_store_id().
CREATE OR REPLACE FUNCTION public.get_merchant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.merchants WHERE user_id = auth.uid();
$$;

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.stores;

CREATE POLICY "Merchants manage own stores - insert" ON public.stores
FOR INSERT WITH CHECK (merchant_id = public.get_merchant_id());

CREATE POLICY "Merchants manage own stores - update" ON public.stores
FOR UPDATE USING (merchant_id = public.get_merchant_id());

-- Las policies de SELECT público existentes (Allow public read access for stores,
-- Allow select for everyone) quedan intactas -- son necesarias para el storefront público.

-- ============================================================
-- 3. merchants: restaurar el scope "own" que decía la policy pero no cumplía
-- ============================================================
DROP POLICY IF EXISTS "Users can manage their own merchant profile" ON public.merchants;
CREATE POLICY "Users can manage their own merchant profile" ON public.merchants
FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 4. admin_finances: acceso total sin restricción -> bloqueado completo
-- ============================================================
-- Tabla interna de YAHPOS! (finanzas de la plataforma, no de un tenant). Todo el acceso
-- legítimo pasa por Server Actions con createAdminClient() (ver Parte 2 de este handoff)
-- -- no necesita ninguna policy para authenticated/anon, service_role bypassea RLS igual.
DROP POLICY IF EXISTS "Admins can manage finances" ON public.admin_finances;

-- ============================================================
-- 5. cash_movements: acceso total sin restricción -> scope por tienda
-- ============================================================
DROP POLICY IF EXISTS "Permitir todo a cash_movements" ON public.cash_movements;
CREATE POLICY store_isolation_policy ON public.cash_movements
FOR ALL USING (store_id = public.get_store_id());

-- ============================================================
-- 6. shifts: sacar el "cualquiera puede leer/escribir cualquier turno"
-- ============================================================
-- Las otras 3 policies existentes (Admins pueden gestionar los turnos, Todos los
-- trabajadores pueden ver sus turnos, store_isolation_policy) ya cubren los casos
-- legítimos -- esta era la única sin ninguna restricción.
DROP POLICY IF EXISTS "Permitir gestión de turnos" ON public.shifts;

-- ============================================================
-- 7. store_settings: tabla sin uso en el código actual, acceso total -> bloqueado
-- ============================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.store_settings;
-- Se deja "Allow public read for store_settings" intacta (solo lectura, sin riesgo).

-- ============================================================
-- 8. supplier_product_mappings: nombre decía "admin users", condición real era
--    "cualquier usuario autenticado" -> scope por tienda
-- ============================================================
DROP POLICY IF EXISTS "Enable all actions for admin users" ON public.supplier_product_mappings;
DROP POLICY IF EXISTS "Enable select for all authenticated users" ON public.supplier_product_mappings;
CREATE POLICY store_isolation_policy ON public.supplier_product_mappings
FOR ALL USING (store_id = public.get_store_id());

COMMIT;
```

## Fix — Parte 2: cambios de app (cliente admin en vez de cliente RLS-normal)

Una vez cerrados los agujeros de arriba, varios flujos legítimos que hoy funcionan SOLO gracias
a esas policies abiertas van a empezar a fallar (correctamente bloqueados por RLS) a menos que
usen el cliente admin (`createAdminClient()`, que bypassea RLS de forma controlada del lado
servidor). Estos son TODOS los puntos identificados que lo necesitan — se verificó cada uno
contra el código real, no es una lista genérica.

### 2a. `src/app/developer/actions/stores.ts`

Agregar el import (ya existe `createClient`, agregar al lado):
```ts
import { createClient, createAdminClient } from '@/lib/supabase'
```

Reemplazar el paso 3.1 (auto-asignación al creador, líneas ~63-69):

Antes:
```ts
    await supabase
      .from('profiles')
      .update({ 
        role: 'owner',
        store_id: newStore.id 
      })
      .eq('id', user.id)
```
Después:
```ts
    const adminSupabase = createAdminClient()
    await adminSupabase
      .from('profiles')
      .update({ 
        role: 'owner',
        store_id: newStore.id 
      })
      .eq('id', user.id)
```

Reemplazar el paso 3.3 (asignación de dueño por email, líneas ~87-95) -- usar el mismo
`adminSupabase` ya creado arriba:

Antes:
```ts
      if (ownerProfile) {
        await supabase
          .from('profiles')
          .update({ 
            role: 'admin', // O 'owner' según preferencia
            store_id: newStore.id 
          })
          .eq('id', ownerProfile.id)
      }
```
Después:
```ts
      if (ownerProfile) {
        await adminSupabase
          .from('profiles')
          .update({ 
            role: 'admin', // O 'owner' según preferencia
            store_id: newStore.id 
          })
          .eq('id', ownerProfile.id)
      }
```

No tocar el `.insert()` de `stores` (líneas ~40-57) -- sigue funcionando igual con el cliente
normal, la nueva policy de INSERT (`merchant_id = auth.get_merchant_id()`) ya lo permite.

### 2b. `src/app/developer/actions/financial.ts`

Cambiar `createClient` por `createAdminClient` en las 3 funciones del archivo (import y uso):

```ts
import { createAdminClient } from '@/lib/supabase'
```
En `updateStoreBillingAction`, `getFinancialStatsAction`, y `recordAdminExpenseAction`, cambiar
`const supabase = await createClient()` por `const supabase = createAdminClient()` (confirmado:
`createAdminClient()` es una función síncrona, SIN `await` -- `src/lib/supabase.ts:25`). El
resto de la lógica de cada función queda exactamente igual.

### 2c. `src/app/api/staff/route.ts`

Agregar import:
```ts
import { createAdminClient } from '@/lib/supabase'
```

En `POST` (líneas ~25-58) y `PATCH` (líneas ~60-90), cambiar `auth.supabase` por un cliente
admin nuevo SOLO para la llamada a `.from('profiles')`:

Antes (fragmento de POST, línea ~38):
```ts
    const { data, error } = await auth.supabase
      .from('profiles')
      .upsert({
```
Después:
```ts
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('profiles')
      .upsert({
```

Antes (fragmento de PATCH, línea ~75):
```ts
    const { data, error } = await auth.supabase
      .from('profiles')
      .update(updateData)
```
Después:
```ts
    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('profiles')
      .update(updateData)
```

No tocar `GET` ni `DELETE` -- `GET` es solo lectura, `DELETE` ya hace un `update` de
`role: 'user'` que también va a necesitar el mismo cambio (agregarlo ahí también, mismo patrón).

### 2d. `src/app/api/auth/register/route.ts`

Ya importa `createAdminClient` (se usa más abajo en el archivo, línea ~77). Solo hay que usar
ese mismo cliente para el upsert de perfil en vez del cliente normal.

Antes (línea ~51):
```ts
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
```
Después:
```ts
    const adminSupabase = createAdminClient()
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
```
(Si más abajo en el archivo ya se crea `const admin = createAdminClient()` para el paso 3, se
puede reusar esa misma variable en vez de crear una nueva -- lo que sea menos código repetido,
mientras el upsert de perfil use el cliente admin.)

### 2e. `src/app/api/customers/route.ts`

Agregar import si no existe:
```ts
import { createAdminClient } from '@/lib/supabase'
```

Reemplazar SOLO la rama de actualización de cliente existente (líneas ~131-144, la que tiene
`if (existing) { ... }`) -- la rama de creación (`insert`, líneas ~147-160) NO necesita cambio
porque un INSERT no dispara el trigger de protección (solo protege UPDATE):

Antes:
```ts
      result = await auth.supabase
        .from('profiles')
        .update({ 
          first_name: firstName,
          last_name: lastName || null,
          email: email ? email.toLowerCase().trim() : null,
          loyalty_points: points,
          role: 'customer',
          store_id: auth.storeId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('*')
        .single()
```
Después:
```ts
      const adminSupabase = createAdminClient()
      result = await adminSupabase
        .from('profiles')
        .update({ 
          first_name: firstName,
          last_name: lastName || null,
          email: email ? email.toLowerCase().trim() : null,
          loyalty_points: points,
          role: 'customer',
          store_id: auth.storeId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('*')
        .single()
```

## Plan de pruebas (obligatorio, exhaustivo -- cambio de seguridad en 9 tablas + 5 archivos)

- [ ] Migración SQL corre sin error en Supabase Studio
- [ ] **Re-test del exploit original:** crear cuenta cliente normal, intentar `PATCH` directo a
      `/rest/v1/profiles?id=eq.<propio-id>` con `role: 'owner', store_id: '<tienda ajena>'` --
      debe FALLAR ahora (antes daba 200 y funcionaba)
- [ ] **Registro de cliente nuevo** (web, `/registro` o similar) -- crear cuenta, verificar que
      el perfil queda con `role: 'customer'` y `store_id` correcto de la tienda actual
- [ ] **`/admin/personal`** -- agregar trabajador nuevo, cambiar su rango con el dropdown --
      debe seguir funcionando (vía cliente admin ahora)
- [ ] **`/developer` → Nueva Tienda** -- crear tienda con tu propio email como dueño -- tu
      perfil debe quedar `role: owner, store_id: <nueva tienda>`
- [ ] **`/developer` → Nueva Tienda con owner_email de otro usuario ya registrado** -- ese
      usuario debe quedar correctamente asignado (antes fallaba en silencio)
- [ ] **`/developer` → editar plan/estado de pago de una tienda ajena** (`updateStoreBillingAction`)
      -- debe seguir funcionando
- [ ] **POS: registrar cliente nuevo en checkout** (`/api/customers` rama de creación) -- sigue
      funcionando igual
- [ ] **POS: actualizar cliente existente** (mismo endpoint, rama de update) -- debe seguir
      funcionando (vía cliente admin ahora)
- [ ] **Movimientos de caja** (`cash_movements`, apertura/cierre/ingreso/retiro en POS) -- sigue
      funcionando igual con una sesión de staff normal
- [ ] **Ingresos con IA → aprobar ajuste** (`supplier_product_mappings`) -- sigue funcionando
- [ ] Cualquier tienda YA NO se puede editar/borrar desde una cuenta sin relación con ella
      (probar `PATCH`/`DELETE` directo a `/rest/v1/stores?id=eq.<tienda-ajena>` con una cuenta
      cliente cualquiera -- debe fallar)
- [ ] `npx tsc --noEmit -p .` con salida completa en el Report Back

## Do Not

- No tocar `auth.get_store_id()`, `public.get_store_id()`, `public.get_current_store_id()`,
  `auth.get_merchant_id()` -- ya están bien, no se tocan
- No tocar las policies `admin_total`/`manager_profile_access` en `profiles` -- están muertas
  (comparan contra un claim de JWT que nunca tiene ese valor), tocarlas no cambia nada, no vale
  el riesgo de tocar `profiles` más de lo necesario en un cambio ya grande
- No tocar las policies duplicadas `store_isolation` (con `get_current_store_id()`) en
  `branches`/`cash_sessions`/`categories`/`inventory`/`order_items`/`orders`/`products`/
  `settings`/`terminals` -- son redundantes pero no peligrosas, limpiarlas es un P2 aparte, no
  esto
- No tocar ningún otro archivo fuera de los 5 listados en la Parte 2
- No agregar validación ni lógica nueva más allá de cambiar qué cliente de Supabase se usa en
  cada llamada puntual -- el comportamiento de la app debe ser idéntico al de hoy, solo cambia
  QUIÉN tiene permiso de hacer los cambios que la app ya hacía
