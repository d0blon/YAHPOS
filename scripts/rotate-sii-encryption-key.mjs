/**
 * Rotación de clave de cifrado de secretos por tienda.
 *
 * Uso (Node >= 20):
 *   SII_ENCRYPTION_KEY_OLD=<32 chars> SII_ENCRYPTION_KEY_NEW=<32 chars> \
 *     node --env-file=.env.local scripts/rotate-sii-encryption-key.mjs
 *
 * Descifra con la clave vieja (GCM 02: y CBC legacy) y vuelve a cifrar en GCM
 * con la clave nueva. No imprime valores: solo filas procesadas por tabla.
 */

import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const GCM_PREFIX = '02:'
const IV_GCM_LENGTH = 12
const IV_CBC_LENGTH = 16
const TAG_LENGTH = 16
const PAGE_SIZE = 500

const SETTINGS_KEYS = [
  'payment_tuu_api_key',
  'payment_mercadopago_access_token',
  'payment_flow_api_key',
  'payment_flow_api_secret',
  'payment_webpay_commerce_code',
  'payment_webpay_api_key',
  'payment_blumi_api_key',
]

function requireKey(name) {
  // Misma normalización que src/lib/crypto.ts (producción exige 32 caracteres).
  const value = process.env[name] || ''
  if (!value) throw new Error(`Falta ${name}`)
  if (process.env.NODE_ENV === 'production' && value.length !== 32) {
    throw new Error(`${name} debe tener exactamente 32 caracteres`)
  }
  return Buffer.from(value.padEnd(32, '0').substring(0, 32), 'utf8')
}

function decrypt(text, key) {
  if (typeof text !== 'string' || text.length === 0) throw new Error('Valor cifrado inválido')

  if (text.startsWith(GCM_PREFIX)) {
    const parts = text.slice(GCM_PREFIX.length).split(':')
    if (parts.length !== 3) throw new Error('Cifrado GCM inválido')
    const [ivHex, tagHex, dataHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    const data = Buffer.from(dataHex, 'hex')
    if (iv.length !== IV_GCM_LENGTH || tag.length !== TAG_LENGTH) throw new Error('Cifrado GCM inválido')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_LENGTH })
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
  }

  // Legacy CBC: ivHex:dataHex
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift() || '', 'hex')
  const data = Buffer.from(parts.join(':'), 'hex')
  if (iv.length !== IV_CBC_LENGTH || data.length === 0) throw new Error('Cifrado CBC inválido')
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

function encrypt(text, key) {
  const iv = crypto.randomBytes(IV_GCM_LENGTH)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${GCM_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

function rotateValue(value, oldKey, newKey) {
  if (typeof value !== 'string' || value.length === 0) return null
  return encrypt(decrypt(value, oldKey), newKey)
}

async function fetchAll(supabase, table, columns, filter) {
  const rows = []
  let from = 0

  for (;;) {
    let query = supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1)
    if (filter) query = filter(query)

    const { data, error } = await query
    if (error) throw new Error(`No se pudo leer ${table}`)

    const batch = data || []
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

async function rotateTable({ supabase, table, columns, updateRow, oldKey, newKey }) {
  const rows = await fetchAll(supabase, table, columns)
  let processed = 0
  let skipped = 0

  for (const row of rows) {
    const patch = {}
    let failed = false

    for (const column of columns.split(',').map((c) => c.trim())) {
      if (column === 'id' || column === 'key' || column === 'store_id') continue
      try {
        const rotated = rotateValue(row[column], oldKey, newKey)
        if (rotated !== null) patch[column] = rotated
      } catch {
        failed = true
        break
      }
    }

    if (failed) {
      skipped += 1
      continue
    }
    if (Object.keys(patch).length === 0) continue

    try {
      await updateRow(supabase, row, patch)
      processed += 1
    } catch {
      skipped += 1
    }
  }

  console.log(`${table}: ${processed} filas (${skipped} omitidas)`)
}

async function main() {
  const oldKey = requireKey('SII_ENCRYPTION_KEY_OLD')
  const newKey = requireKey('SII_ENCRYPTION_KEY_NEW')
  if (oldKey.equals(newKey)) throw new Error('Las claves vieja y nueva deben ser distintas')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('Faltan credenciales Supabase')

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const context = { supabase, oldKey, newKey }

  await rotateTable({
    ...context,
    table: 'sii_config',
    columns: 'id, certificado_pfx_encrypted, certificado_password_encrypted',
    updateRow: async (client, row, patch) => {
      const { error } = await client.from('sii_config').update(patch).eq('id', row.id)
      if (error) throw new Error('update failed')
    },
  })

  await rotateTable({
    ...context,
    table: 'sii_folios',
    columns: 'id, caf_xml',
    updateRow: async (client, row, patch) => {
      const { error } = await client.from('sii_folios').update(patch).eq('id', row.id)
      if (error) throw new Error('update failed')
    },
  })

  const settingsRows = await fetchAll(
    supabase,
    'settings',
    'key, value, store_id',
    (query) => query.in('key', SETTINGS_KEYS)
  )

  let settingsProcessed = 0
  let settingsSkipped = 0
  for (const row of settingsRows) {
    let rotated
    try {
      rotated = rotateValue(row.value, oldKey, newKey)
    } catch {
      settingsSkipped += 1
      continue
    }
    if (rotated === null) continue

    const { error } = await supabase
      .from('settings')
      .update({ value: rotated })
      .eq('key', row.key)
      .eq('store_id', row.store_id)

    if (error) settingsSkipped += 1
    else settingsProcessed += 1
  }
  console.log(`settings: ${settingsProcessed} filas (${settingsSkipped} omitidas)`)
}

main().catch((error) => {
  console.error(`rotate-sii-encryption-key: ${error instanceof Error ? error.message : 'error desconocido'}`)
  process.exitCode = 1
})
