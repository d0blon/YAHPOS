/**
 * Migración de secretos de tienda desde variables de entorno a `settings` cifrado.
 *
 * Uso (Node >= 20):
 *   node --env-file=.env.local scripts/migrate-tenant-secrets-to-store.mjs <store-uuid>
 *
 * Las credenciales se leen de process.env en runtime, se cifran con el mismo
 * esquema AES-256-GCM de src/lib/crypto.ts (02:iv:tag:data) y se upsertean con
 * onConflict 'key,store_id'. No imprime valores, solo conteos/booleanos.
 */

import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const SECRET_ENV_MAP = [
  ['TRANSBANK_COMMERCE_CODE', 'payment_webpay_commerce_code'],
  ['TRANSBANK_API_KEY', 'payment_webpay_api_key'],
  ['BLUMI_API_KEY', 'payment_blumi_api_key'],
]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const GCM_PREFIX = '02:'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta variable de entorno requerida: ${name}`)
  return value
}

function getKey() {
  // Mismo normalize que src/lib/crypto.ts (en producción exige 32 caracteres).
  const key = process.env.SII_ENCRYPTION_KEY || ''
  if (!key) throw new Error('Falta SII_ENCRYPTION_KEY')
  if (process.env.NODE_ENV === 'production' && key.length !== 32) {
    throw new Error('SII_ENCRYPTION_KEY debe tener exactamente 32 caracteres')
  }
  return Buffer.from(key.padEnd(32, '0').substring(0, 32), 'utf8')
}

function encrypt(text, key) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${GCM_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

async function main() {
  const storeId = process.argv[2] || ''
  if (!UUID_RE.test(storeId)) throw new Error('Se requiere un store UUID válido como primer argumento')

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const key = getKey()

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .limit(1)
    .maybeSingle()

  if (storeError) throw new Error('No se pudo verificar la tienda')
  console.log(`store_found: ${Boolean(store)}`)
  if (!store) process.exitCode = 1
  if (!store) return

  const rows = []
  for (const [envName, settingKey] of SECRET_ENV_MAP) {
    const value = process.env[envName]
    if (!value) continue
    rows.push({ key: settingKey, value: encrypt(value, key), store_id: storeId })
  }

  if (rows.length === 0) {
    console.log('settings_upserted: 0/0')
    return
  }

  const { error } = await supabase
    .from('settings')
    .upsert(rows, { onConflict: 'key,store_id' })

  if (error) throw new Error('No se pudo guardar la configuración cifrada')

  console.log(`settings_upserted: ${rows.length}/${SECRET_ENV_MAP.length}`)
}

main().catch((error) => {
  console.error(`migrate-tenant-secrets-to-store: ${error instanceof Error ? error.message : 'error desconocido'}`)
  process.exitCode = 1
})
