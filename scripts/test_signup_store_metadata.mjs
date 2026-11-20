/**
 * test_signup_store_metadata.mjs — PRUEBA DIAGNÓSTICA CON ESCRITURA. NO EJECUTAR.
 *
 * Requiere autorización explícita del dueño + credenciales ROTADAS.
 * Crea y BORRA usuarios desechables en Auth. NO ejecutar sin STORE_ID y
 * STORE_ID_AJENO reales provistos por el dueño.
 *
 * Demuestra el vector 038:124-131 + 001:131-134: handle_new_user() toma
 * raw_user_meta_data->>'store_id' en INSERT, mientras protect_store_id_in_metadata()
 * solo bloquea UPDATE. Si el perfil queda con la tienda ajena, hay escalada cross-tenant.
 *
 * Fail-closed: ALLOW_SIGNUP_PROBE=1 además de las variables requeridas.
 * Output: conteos/booleanos. Sin emails, IDs de usuario, secretos ni UUIDs en logs.
 *
 * Uso (solo con autorización): node --env-file=.env.local scripts/test_signup_store_metadata.mjs
 */

import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta variable de entorno requerida: ${name}`)
  return value
}

const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
const ownStoreId = requireEnv('STORE_ID')
const foreignStoreId = requireEnv('STORE_ID_AJENO')
const password = requireEnv('TEST_USER_PASSWORD')

if (process.env.ALLOW_SIGNUP_PROBE !== '1') {
  throw new Error('Probe deshabilitada: definir ALLOW_SIGNUP_PROBE=1 solo con autorización del dueño')
}

if (ownStoreId === foreignStoreId) {
  throw new Error('STORE_ID y STORE_ID_AJENO deben ser distintos')
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })
const failures = []

async function assertStoresExist() {
  const { count, error } = await supabase
    .from('stores')
    .select('id', { count: 'exact', head: true })
    .in('id', [ownStoreId, foreignStoreId])

  if (error) throw new Error('No se pudieron validar las tiendas (detalles omitidos)')
  if (count !== 2) throw new Error('STORE_ID / STORE_ID_AJENO: se requieren 2 tiendas existentes y distintas')
}

async function cleanup(userId) {
  let ok = true

  try {
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) ok = false
  } catch {
    ok = false
  }

  // Borrado estrictamente acotado al usuario creado: nunca .eq('store_id', ...) como único filtro.
  for (const [table, column] of [['user_stores', 'user_id'], ['profiles', 'id']]) {
    try {
      const { error } = await supabase.from(table).delete().eq(column, userId)
      if (error) ok = false
    } catch {
      ok = false
    }
  }

  return ok
}

async function probeCase(kind, metadataStoreId) {
  const email = `test_${Date.now()}_${randomBytes(4).toString('hex')}@yahpos.cl`
  let userId = null

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { store_id: metadataStoreId },
    })

    if (error || !data?.user?.id) {
      console.error(`caso ${kind}: creación fallida (detalles omitidos)`)
      failures.push(`create_${kind}`)
      return
    }
    userId = data.user.id

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', userId)
      .maybeSingle()

    if (profileError || !profile) {
      console.error(`caso ${kind}: perfil no encontrado (detalles omitidos)`)
      failures.push(`profile_${kind}`)
      return
    }

    if (kind === 'control') {
      const matches = profile.store_id === ownStoreId
      console.log(`control_store_matches: ${matches}`)
      if (!matches) failures.push('control_store_matches')
      return
    }

    const leaked = profile.store_id === foreignStoreId
    console.log(`attack_metadata_store_id: ${leaked ? 'LEAK' : 'BLOCKED'}`)
    if (leaked) failures.push('attack_metadata_store_id')

    const { count, error: memberError } = await supabase
      .from('user_stores')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('store_id', foreignStoreId)

    if (memberError) {
      console.error(`caso ${kind}: membresía no verificable (detalles omitidos)`)
      failures.push('attack_user_stores_check')
    } else if ((count ?? 0) > 0) {
      console.log('attack_user_stores_foreign: LEAK')
      failures.push('attack_user_stores_foreign')
    } else {
      console.log('attack_user_stores_foreign: BLOCKED')
    }
  } finally {
    if (userId) {
      const ok = await cleanup(userId)
      console.log(`cleanup_ok: ${ok}`)
      if (!ok) {
        console.log('cleanup_failed: 1')
        failures.push(`cleanup_${kind}`)
      }
    }
  }
}

await assertStoresExist()
await probeCase('control', ownStoreId)
await probeCase('ataque', foreignStoreId)

if (failures.length) {
  console.error(`FALLOS: ${failures.join(', ')}`)
  console.log('veredicto: FALLO')
  process.exitCode = 1
} else {
  console.log('veredicto: OK')
}
